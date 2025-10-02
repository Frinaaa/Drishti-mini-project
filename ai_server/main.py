import uvicorn
import os
import shutil
import json
import base64
import time
from datetime import datetime
from typing import Dict, Any, List
from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import logging
import asyncio  # added
from typing import Optional
import subprocess
import sys

# --- 1. Basic Logging Configuration ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Will hold the original import error if DeepFace (or TensorFlow) fails to import.
DEEPFACE_IMPORT_ERROR: Optional[Exception] = None

def import_deepface():
    """Attempt to import DeepFace lazily. If it fails, store the error and return None.

    This prevents the whole app from crashing at import time on systems missing
    native DLLs (for example, the MSVC runtime required by TensorFlow).
    """
    global DEEPFACE_IMPORT_ERROR
    try:
        from deepface import DeepFace  # type: ignore
        return DeepFace
    except Exception as e:
        DEEPFACE_IMPORT_ERROR = e
        logger.error(f"DeepFace import failed: {e}")
        return None

# --- 2. CONFIGURATION CONSTANTS (FOR EASY TUNING) ---
# --- NEW ---: Model choice is now a configurable variable.
# Experiment with "ArcFace", "FaceNet", "DeepFace" for potentially better accuracy.
MODEL_NAME = "VGG-Face"

# --- NEW ---: Confidence threshold to prevent false positives.
# A match is only considered valid if the confidence is ABOVE this value.
# VGG-Face and FaceNet are often good around 0.75-0.80. ArcFace is stricter.
CONFIDENCE_THRESHOLD = 0.75

# --- 3. Initialize the FastAPI Application ---
app = FastAPI(
    title="Drishti AI Face Matching API",
    description="Provides robust face matching, logs sightings, serves images, and provides dashboard data.",
    version="2.2.0 (Robust)"
)

# --- 4. CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# --- 5. Define All Critical File Paths ---
AI_SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(AI_SERVER_DIR, "..", "backend"))
UPLOADS_DIR = os.path.join(BACKEND_DIR, "uploads")
DB_PATH = os.path.join(UPLOADS_DIR, "reports")
TEMP_UPLOAD_PATH = os.path.join(AI_SERVER_DIR, "temp_uploads")
METADATA_PATH = os.path.join(AI_SERVER_DIR, "report_metadata.json")
UNIDENTIFIED_SIGHTINGS_PATH = os.path.join(UPLOADS_DIR, "unidentified_sightings")

# --- 6. Mount Static Directory to Serve Images ---
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# --- 7. Helper Functions ---
def load_report_metadata() -> Dict[str, Any]:
    if os.path.exists(METADATA_PATH):
        try:
            with open(METADATA_PATH, 'r') as f: return json.load(f)
        except json.JSONDecodeError: return {"reports": {}}
    return {"reports": {}}

# NEW: synchronous helper to perform blocking DeepFace warm-up
def warm_up_deepface(dummy_image_path: str):
    DeepFace = import_deepface()
    if DEEPFACE_IMPORT_ERROR:
        # Re-raise here so the startup logs show the root cause clearly.
        raise DEEPFACE_IMPORT_ERROR

    try:
        model = DeepFace.build_model(MODEL_NAME)
        DeepFace.represent(
            img_path=dummy_image_path,
            model_name=MODEL_NAME,
            model=model,
            enforce_detection=False
        )
        logger.info("✅ DeepFace model built and warmed up.")
    except Exception:
        # Fallback: initialize detector (lighter) to ensure backend is ready.
        try:
            DeepFace.extract_faces(img_path=dummy_image_path, detector_backend='mtcnn', enforce_detection=False)
            logger.info("✅ DeepFace detector warmed up (fallback).")
        except Exception as e:
            logger.warning(f"DeepFace warm-up fallback failed: {e}")

# --- 8. Application Startup Logic ---
@app.on_event("startup")
async def startup_event():
    logger.info("Server is starting up...")
    os.makedirs(DB_PATH, exist_ok=True)
    os.makedirs(TEMP_UPLOAD_PATH, exist_ok=True)
    os.makedirs(UNIDENTIFIED_SIGHTINGS_PATH, exist_ok=True)
    
    try:
        image_files = [f for f in os.listdir(DB_PATH) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        if image_files:
            dummy_image_path = os.path.join(DB_PATH, image_files[0])
            logger.info(f"Pre-building DeepFace model ({MODEL_NAME})...")
            # Run blocking warm-up in a thread to avoid blocking the event loop
            loop = asyncio.get_running_loop()
            try:
                await loop.run_in_executor(None, warm_up_deepface, dummy_image_path)
            except asyncio.CancelledError:
                logger.warning("Startup warm-up cancelled (server is shutting down).")
                return
        else:
            logger.warning("⚠️ 'reports' directory is empty.")
    except Exception as e:
        logger.error(f"🔴 CRITICAL: Could not pre-build DeepFace model. Error: {e}")

# --- 9. API ENDPOINTS ---

@app.get("/reports/recent", response_model=List[Dict[str, Any]])
async def get_recent_reports():
    """Provides the 5 most recent reports for the Police Dashboard."""
    metadata = load_report_metadata()
    reports_list = list(metadata.get("reports", {}).values())
    reports_list.sort(key=lambda r: r.get("submitted_at", "1970-01-01T00:00:00"), reverse=True)
    return reports_list[:5]

@app.post("/find_match_react_native")
async def find_match_react_native(file_data: str = Form(...)):
    """Receives an image from the app and performs a robust face search."""
    temp_file_path = None
    try:
        if 'base64,' in file_data: _, base64_data = file_data.split(',', 1)
        else: base64_data = file_data
        image_data = base64.b64decode(base64_data)
        
        filename = f"capture_{int(time.time())}.jpg"
        temp_file_path = os.path.join(TEMP_UPLOAD_PATH, filename)
        with open(temp_file_path, "wb") as f: f.write(image_data)
        
        return await process_face_match(temp_file_path, filename)
    except Exception as e:
        logger.error(f"Error processing upload: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

async def process_face_match(temp_file_path: str, filename: str):
    """
    Main logic for face matching with improved accuracy and reliability.
    """
    try:
        DeepFace = import_deepface()
        if DEEPFACE_IMPORT_ERROR or DeepFace is None:
            # Return a helpful message to the client rather than crashing the server.
            logger.error(f"DeepFace unavailable at runtime: {DEEPFACE_IMPORT_ERROR}")
            raise HTTPException(
                status_code=503,
                detail=(
                    "Face-matching is temporarily unavailable on the server because a required native dependency is missing. "
                    "On Windows, install the Microsoft C++ Redistributable (2015-2019) and ensure the installation directory is in your PATH. "
                    "See https://support.microsoft.com/help/2977003/the-latest-supported-visual-c-downloads for details."
                )
            )

        # --- MODIFIED ---: enforce_detection is now True for accuracy.
        # This will raise a ValueError if no face is found in the uploaded image.
        # Use a subprocess worker to run DeepFace.find so that heavy native libraries
        # (TensorFlow) don't block or crash the main event loop. We also enforce a
        # timeout to avoid very long-running requests that cause client AbortErrors.

        worker_path = os.path.join(AI_SERVER_DIR, 'deepface_worker.py')
        cmd = [sys.executable, worker_path, temp_file_path, DB_PATH, MODEL_NAME, str(CONFIDENCE_THRESHOLD)]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30.0)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            logger.error('DeepFace worker timed out')
            return await handle_no_match(temp_file_path, 'Face search timed out. Please try again.')

        if proc.returncode != 0 and not stdout:
            err = stderr.decode(errors='ignore') if stderr else 'Unknown error'
            logger.error(f'DeepFace worker failed: {err}')
            return await handle_no_match(temp_file_path, 'Face search failed due to server error.')

        out_text = stdout.decode(errors='ignore')
        try:
            result = json.loads(out_text)
        except Exception as e:
            logger.error(f'Failed to parse worker output: {e} -- output: {out_text}')
            return await handle_no_match(temp_file_path, 'Face search failed (invalid worker output).')

        if result.get('status') == 'no_match':
            return await handle_no_match(temp_file_path, 'No similar face found in database.')
        if result.get('status') == 'error':
            logger.error(f"Worker reported error: {result.get('error')}")
            return await handle_no_match(temp_file_path, 'Face search failed due to server error.')

        # status == 'match'
        confidence = float(result.get('confidence', 0.0))
        identity_path = result.get('identity')

        # --- NEW ---: Implementing the confidence threshold check.
        if confidence < CONFIDENCE_THRESHOLD:
            logger.info(f"Match found, but confidence {confidence:.2f} is below threshold of {CONFIDENCE_THRESHOLD}.")
            return await handle_no_match(temp_file_path, "A potential match was found, but with low confidence.")

        # If we reach here, the match is considered valid.
        identity_path = best_match['identity']
        relative_path = os.path.relpath(identity_path, UPLOADS_DIR).replace("\\", "/")
        report_id = os.path.splitext(os.path.basename(identity_path))[0]
        report_data = load_report_metadata().get("reports", {}).get(report_id, {})

        logger.info(f"✅ High-confidence match found: Report ID {report_id} with confidence {confidence:.2f}")
        return {
            "match_found": True,
            "report_id": report_id,
            "confidence": confidence,
            "file_path": f"uploads/{relative_path}",
            "person_name": report_data.get("person_name", "Unknown"),
            "age": report_data.get("age", "Unknown"),
            "gender": report_data.get("gender", "Unknown"),
            "last_seen": report_data.get("last_seen", "Not specified"),
            **report_data
        }

    except ValueError as e:
        # --- IMPROVED ---: This 'except' block now handles "no face found" errors with specific messages.
        logger.warning(f"Face detection error: {str(e)}")
        # Check if the error message indicates no face was found.
        if "Face could not be detected" in str(e):
            raise HTTPException(status_code=400, detail="No face could be detected in the uploaded image. Please ensure the photo shows a clear, front-facing view of a person's face.")
        elif "Face could not be found" in str(e):
            raise HTTPException(status_code=400, detail="No face could be found in the uploaded image. Please use a clearer photo with better lighting.")
        else:
            # Handle other potential ValueErrors from the library.
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred during face analysis: {str(e)}")

async def handle_no_match(temp_file_path: str, message: str):
    """
    A helper function to log an unidentified sighting and return a standard "no match" response.
    """
    sighting_filename = f"sighting_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
    destination_path = os.path.join(UNIDENTIFIED_SIGHTINGS_PATH, sighting_filename)
    shutil.copy(temp_file_path, destination_path)
    logger.info(f"✅ Saved unidentified sighting photo to: {destination_path}")
    return {"match_found": False, "message": f"{message} The sighting has been logged."}

# --- 10. Start the Uvicorn Server ---
if __name__ == "__main__":
    # Run the app directly. Use the lowercase module path matching this file name.
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)