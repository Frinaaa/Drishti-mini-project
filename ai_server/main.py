import uvicorn
import os
import shutil
import json
import base64
import time
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # --- ADDED ---: For serving images
from deepface import DeepFace
import logging

# --- 1. Basic Logging Configuration ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 2. Initialize the FastAPI Application ---
app = FastAPI(
    title="Drishti AI Face Matching API",
    description="An API that uses DeepFace to find matches for missing persons, stores unmatched sightings, and serves report images.",
    version="1.1.0"
)

# --- 3. Configure CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 4. Define Critical File Paths ---
AI_SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(AI_SERVER_DIR, "..", "backend"))
UPLOADS_DIR = os.path.join(BACKEND_DIR, "uploads") # --- ADDED ---: Main uploads folder
DB_PATH = os.path.join(UPLOADS_DIR, "reports") # This is the database of known faces
TEMP_UPLOAD_PATH = os.path.join(AI_SERVER_DIR, "temp_uploads")
METADATA_PATH = os.path.join(AI_SERVER_DIR, "report_metadata.json")

# --- ADDED ---: Directory for storing faces that were searched but had no match
UNIDENTIFIED_SIGHTINGS_PATH = os.path.join(UPLOADS_DIR, "unidentified_sightings")

# --- 5. Mount Static Directory for Serving Images ---
# --- ADDED ---: This is CRITICAL for the frontend to display images.
# It makes the entire 'backend/uploads' folder accessible at the URL '/uploads'.
# Example: A file at backend/uploads/reports/person.jpg will be available at http://<your_ip>:8000/uploads/reports/person.jpg
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


# --- 6. Helper Functions (Unchanged) ---
def load_report_metadata() -> Dict[str, Any]:
    if os.path.exists(METADATA_PATH):
        try:
            with open(METADATA_PATH, 'r') as f: return json.load(f)
        except Exception: pass
    return {"reports": {}}

def save_report_metadata(metadata: Dict[str, Any]) -> None:
    with open(METADATA_PATH, 'w') as f:
        json.dump(metadata, f, indent=2, default=str)

def generate_report_id(person_name: str, timestamp: str) -> str:
    clean_name = person_name.lower().replace(' ', '_').replace('-', '_')
    return f"{clean_name}_{timestamp}"


# --- 7. Application Startup Logic ---
@app.on_event("startup")
async def startup_event():
    logger.info("Server is starting up...")
    os.makedirs(DB_PATH, exist_ok=True)
    os.makedirs(TEMP_UPLOAD_PATH, exist_ok=True)
    os.makedirs(UNIDENTIFIED_SIGHTINGS_PATH, exist_ok=True) # --- ADDED ---
    logger.info(f"Report database path: {DB_PATH}")
    logger.info(f"Temporary upload path: {TEMP_UPLOAD_PATH}")
    logger.info(f"Unidentified sightings path: {UNIDENTIFIED_SIGHTINGS_PATH}") # --- ADDED ---

    if not os.path.exists(METADATA_PATH):
        save_report_metadata({"reports": {}})

    try:
        image_files = [f for f in os.listdir(DB_PATH) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        if image_files:
            dummy_image_path = os.path.join(DB_PATH, image_files[0])
            logger.info("Pre-building DeepFace model...")
            DeepFace.find(img_path=dummy_image_path, db_path=DB_PATH, model_name="VGG-Face", enforce_detection=False)
            logger.info("✅ DeepFace model built and ready.")
        else:
            logger.warning("⚠️ 'reports' directory is empty. No matches can be found until reports are added.")
    except Exception as e:
        logger.error(f"🔴 CRITICAL: Could not pre-build DeepFace model. Error: {e}")

# --- 8. API Endpoints ---

@app.get("/")
async def read_root():
    return {"message": "Drishti AI Face Matching Server is online."}


@app.post("/find_match_react_native")
async def find_match_react_native(file_data: str = Form(...)):
    """
    Endpoint for React Native. Expects a base64 encoded image data URL.
    """
    logger.info("Processing React Native face search request.")
    try:
        if 'base64,' in file_data:
            header, base64_data = file_data.split(',', 1)
        else:
            # This is for safety, but React Native FileReader usually includes the header
            base64_data = file_data
        
        image_data = base64.b64decode(base64_data)
        
        # Create a unique temporary filename
        filename = f"rn_capture_{int(time.time())}.jpg"
        temp_file_path = os.path.join(TEMP_UPLOAD_PATH, filename)

        with open(temp_file_path, "wb") as f:
            f.write(image_data)
        
        logger.info(f"Saved React Native image to temp path: {temp_file_path}")

        # Use the common logic to find a match and handle the result
        return await process_face_match(temp_file_path, filename)

    except Exception as e:
        logger.error(f"Error processing React Native upload: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")
    finally:
        # Clean up the temporary file
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            logger.info(f"Cleaned up temporary file: {temp_file_path}")


# --- MODIFIED ---: This is the core logic function with the new feature
async def process_face_match(temp_file_path: str, filename: str):
    """
    Core face matching logic.
    - If a match is found, it returns the report details.
    - If NO match is found, it saves the image to the 'unidentified_sightings' folder.
    """
    try:
        dfs = DeepFace.find(
            img_path=temp_file_path,
            db_path=DB_PATH,
            enforce_detection=False, # Allows images where face detection is tricky
            model_name="VGG-Face"
        )

        if not dfs or dfs[0].empty:
            # --- THIS IS THE NEW LOGIC FOR NO-MATCH ---
            logger.info(f"❌ No match found for '{filename}'. Storing as an unidentified sighting.")
            
            # Create a unique name for the unidentified sighting photo
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            sighting_filename = f"sighting_{timestamp}_{filename}"
            destination_path = os.path.join(UNIDENTIFIED_SIGHTINGS_PATH, sighting_filename)
            
            # Copy the temp file to the permanent unidentified sightings folder
            shutil.copy(temp_file_path, destination_path)
            logger.info(f"✅ Saved unmatched photo to: {destination_path}")

            return {"match_found": False, "message": "No similar face found in the database. The sighting has been logged."}

        # --- MATCH FOUND LOGIC (MODIFIED TO RETURN CORRECT URL) ---
        best_match = dfs[0].iloc[0]
        identity_path_absolute = best_match['identity']
        
        # --- MODIFIED ---: Convert the absolute file path to a web-accessible URL path
        # This is essential for the app to be able to display the image.
        relative_path = os.path.relpath(identity_path_absolute, UPLOADS_DIR)
        web_accessible_path = relative_path.replace("\\", "/") # Ensure forward slashes for URLs
        
        report_id = os.path.splitext(os.path.basename(identity_path_absolute))[0]
        metadata = load_report_metadata()
        report_data = metadata.get("reports", {}).get(report_id)
        confidence = 1 - float(best_match['distance'])

        logger.info(f"✅ Match found for '{filename}': {report_id} with confidence {confidence:.2f}")

        response = {
            "match_found": True,
            "report_id": report_id,
            "confidence": confidence,
            # --- MODIFIED ---: Use the correct URL path
            "file_path": f"uploads/{web_accessible_path}", 
        }

        if report_data:
            response.update({
                "person_name": report_data.get("person_name"),
                "age": report_data.get("age"),
                "gender": report_data.get("gender"),
                "last_seen": report_data.get("last_seen"),
                "description": report_data.get("description"),
                "reporterContact": report_data.get("reporterContact"),
                "status": report_data.get("status"),
                "submitted_at": report_data.get("submitted_at")
            })
        return response

    except ValueError as e:
        logger.warning(f"Face detection error for '{filename}': {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Could not find a clear face in the uploaded image. Please use a clearer photo."
        )


# --- (You can keep all your other endpoints like /submit_report, /reports, etc. here) ---
# ... (all other existing endpoints) ...


# --- 9. Start the Uvicorn Server ---
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)