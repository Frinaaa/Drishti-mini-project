# /ai_server/main.py

import uvicorn
import os
import shutil
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from deepface import DeepFace
import logging

# --- 1. Basic Logging Configuration ---
# Helps in debugging and monitoring the server's activity.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 2. Initialize the FastAPI Application ---
app = FastAPI(
    title="Drishti AI Face Matching API",
    description="An API that uses DeepFace to find matches for missing persons and manage report images.",
    version="1.0.0"
)

# --- 3. Configure CORS (Cross-Origin Resource Sharing) ---
# This is crucial for allowing your React Native app (running on a different "origin")
# to communicate with this Python server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins, you can restrict this to your app's domain in production
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# --- 4. Define Critical File Paths ---
# Get the absolute path of the directory where this script is located.
AI_SERVER_DIR = os.path.dirname(os.path.abspath(__file__))

# Define the path to the database of known faces (report photos).
# This path navigates up one level from `ai_server` and then into `backend/uploads/reports`.
DB_PATH = os.path.abspath(os.path.join(AI_SERVER_DIR, "..", "backend", "uploads", "reports"))

# Define a path for temporarily storing uploaded images for processing.
TEMP_UPLOAD_PATH = os.path.join(AI_SERVER_DIR, "temp_uploads")

# Define path for storing report metadata
METADATA_PATH = os.path.join(AI_SERVER_DIR, "report_metadata.json")


# --- 5. Helper Functions for Report Management ---

def load_report_metadata() -> Dict[str, Any]:
    """Load report metadata from JSON file."""
    if os.path.exists(METADATA_PATH):
        try:
            with open(METADATA_PATH, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading metadata: {e}")
    return {"reports": {}}

def save_report_metadata(metadata: Dict[str, Any]) -> None:
    """Save report metadata to JSON file."""
    try:
        with open(METADATA_PATH, 'w') as f:
            json.dump(metadata, f, indent=2, default=str)
    except Exception as e:
        logger.error(f"Error saving metadata: {e}")

def generate_report_id(person_name: str, timestamp: str) -> str:
    """Generate a unique report ID."""
    clean_name = person_name.lower().replace(' ', '_').replace('-', '_')
    return f"{clean_name}_{timestamp}"

# --- 6. Application Startup Logic ---
# This function runs once when the FastAPI server starts.
@app.on_event("startup")
async def startup_event():
    """
    Prepares the server environment by creating necessary directories and pre-building
    the AI model to ensure fast first-time API calls.
    """
    logger.info("Server is starting up...")

    # Create the database and temp folders if they don't exist.
    os.makedirs(DB_PATH, exist_ok=True)
    os.makedirs(TEMP_UPLOAD_PATH, exist_ok=True)
    logger.info(f"Image database path set to: {DB_PATH}")
    logger.info(f"Temporary upload path set to: {TEMP_UPLOAD_PATH}")

    # Initialize metadata file if it doesn't exist
    if not os.path.exists(METADATA_PATH):
        save_report_metadata({"reports": {}})
        logger.info("Initialized report metadata file")

    # Pre-load the AI model to avoid a long delay on the first API request.
    try:
        # Check if there are any images in the database folder to build the model from.
        image_files = [f for f in os.listdir(DB_PATH) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        if image_files:
            # Pick the first image to use for a dummy call.
            dummy_image_path = os.path.join(DB_PATH, image_files[0])
            logger.info("Pre-building DeepFace model... (This may take a moment on the first ever run)")

            # This dummy call forces DeepFace to download model weights and build the computational graph.
            DeepFace.find(
                img_path=dummy_image_path,
                db_path=DB_PATH,
                model_name="VGG-Face", # Using VGG-Face as specified
                enforce_detection=False # Avoids errors if the dummy image has no face
            )
            logger.info("✅ DeepFace model built and ready.")
        else:
            logger.warning("⚠️ 'reports' directory is empty. The server will run, but no matches can be found until images are added.")
    except Exception as e:
        logger.error(f"🔴 CRITICAL: Could not pre-build DeepFace model. Error: {e}")
        logger.error("   The server will still run, but face matching may fail or be very slow initially.")


# --- 7. Define API Endpoints ---

@app.get("/")
async def read_root():
    """ A simple health-check endpoint to confirm the server is running. """
    metadata = load_report_metadata()
    total_reports = len(metadata.get("reports", {}))
    return {
        "message": "Drishti AI Face Matching Server is online and running.",
        "total_reports": total_reports,
        "database_path": DB_PATH
    }


@app.post("/test_upload")
async def test_upload(file: UploadFile = File(...)):
    """ Test endpoint to debug file upload issues. """
    try:
        if not file:
            return {"error": "No file provided"}

        content = await file.read()
        file_size = len(content)

        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "file_size": file_size,
            "success": True
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/submit_report")
async def submit_report(
    user: str = Form(...),
    person_name: str = Form(...),
    age: str = Form(...),
    gender: str = Form(...),
    last_seen: str = Form(...),
    description: str = Form(""),
    relationToReporter: str = Form(""),
    reporterContact: str = Form(""),
    familyEmail: str = Form(""),
    photo: UploadFile = File(...)
):
    """
    Submit a missing person report with image for AI face matching.
    Compatible with both family (submit-report.tsx) and NGO (submit-reports.tsx) forms.
    """
    logger.info(f"Received report submission for: {person_name}")

    # Validate required fields
    if not all([user, person_name, age, gender, last_seen, reporterContact]):
        raise HTTPException(
            status_code=400,
            detail="Missing required fields: user, person_name, age, gender, last_seen, reporterContact"
        )

    if not photo:
        raise HTTPException(status_code=400, detail="Photo is required for face matching")

    # Validate file type
    allowed_extensions = {'.jpg', '.jpeg', '.png'}
    file_extension = os.path.splitext(photo.filename.lower())[1]
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file_extension}. Only JPG, JPEG, and PNG are allowed."
        )

    try:
        # Generate timestamp and report ID
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_id = generate_report_id(person_name, timestamp)

        # Save the photo to the database directory with report ID
        photo_filename = f"{report_id}{file_extension}"
        photo_path = os.path.join(DB_PATH, photo_filename)

        with open(photo_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)

        logger.info(f"Photo saved: {photo_path}")

        # Create report metadata
        report_data = {
            "report_id": report_id,
            "user": user,
            "person_name": person_name,
            "age": int(age),
            "gender": gender,
            "last_seen": last_seen,
            "description": description,
            "relationToReporter": relationToReporter,
            "reporterContact": reporterContact,
            "familyEmail": familyEmail,
            "photo_filename": photo_filename,
            "photo_path": f"uploads/reports/{photo_filename}",
            "status": "Pending Verification",
            "submitted_at": datetime.now().isoformat(),
            "ai_ready": True
        }

        # Save metadata
        metadata = load_report_metadata()
        metadata["reports"][report_id] = report_data
        save_report_metadata(metadata)

        logger.info(f"✅ Report submitted successfully: {report_id}")

        return {
            "message": "Report submitted successfully",
            "report_id": report_id,
            "report": report_data
        }

    except Exception as e:
        logger.error(f"Error submitting report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.get("/reports")
async def get_reports(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, description="Maximum number of reports to return")
):
    """Get all reports with optional filtering."""
    try:
        metadata = load_report_metadata()
        reports = list(metadata.get("reports", {}).values())

        # Apply status filter
        if status:
            reports = [r for r in reports if r.get("status") == status]

        # Sort by submission date (newest first)
        reports.sort(key=lambda x: x.get("submitted_at", ""), reverse=True)

        # Apply limit
        reports = reports[:limit]

        return {
            "reports": reports,
            "total": len(reports),
            "filters": {"status": status, "limit": limit}
        }
    except Exception as e:
        logger.error(f"Error getting reports: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.get("/reports/{report_id}")
async def get_report(report_id: str):
    """Get a specific report by ID."""
    try:
        metadata = load_report_metadata()
        report = metadata.get("reports", {}).get(report_id)

        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        return report
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting report {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.put("/reports/{report_id}/verify")
async def verify_report(report_id: str):
    """Mark a report as verified for AI processing."""
    try:
        metadata = load_report_metadata()
        report = metadata.get("reports", {}).get(report_id)

        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        # Update status
        report["status"] = "Verified"
        report["verified_at"] = datetime.now().isoformat()

        # Save updated metadata
        save_report_metadata(metadata)

        logger.info(f"Report {report_id} verified for AI processing")

        return {
            "message": "Report verified successfully",
            "report_id": report_id,
            "status": "Verified"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying report {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.put("/reports/{report_id}/reject")
async def reject_report(report_id: str):
    """Mark a report as rejected."""
    try:
        metadata = load_report_metadata()
        report = metadata.get("reports", {}).get(report_id)

        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        # Update status
        report["status"] = "Rejected"
        report["rejected_at"] = datetime.now().isoformat()

        # Optionally remove the image file if rejected
        photo_path = os.path.join(DB_PATH, report.get("photo_filename", ""))
        if os.path.exists(photo_path):
            try:
                os.remove(photo_path)
                logger.info(f"Removed rejected report image: {photo_path}")
            except Exception as e:
                logger.warning(f"Could not remove rejected image: {e}")

        # Save updated metadata
        save_report_metadata(metadata)

        logger.info(f"Report {report_id} rejected")

        return {
            "message": "Report rejected successfully",
            "report_id": report_id,
            "status": "Rejected"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting report {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.post("/sync_reports")
async def sync_reports(reports: List[Dict[str, Any]]):
    """
    Sync reports from the main backend server.
    This endpoint allows the backend to push verified reports to the AI server.
    """
    try:
        metadata = load_report_metadata()
        synced_count = 0

        for backend_report in reports:
            # Generate AI report ID
            report_id = generate_report_id(
                backend_report.get("person_name", "Unknown"),
                datetime.now().strftime("%Y%m%d_%H%M%S")
            )

            # Copy image from backend to AI database if it exists
            backend_photo_path = os.path.join(
                os.path.dirname(DB_PATH),
                backend_report.get("photo_url", "").replace("uploads/reports/", "")
            )

            if os.path.exists(backend_photo_path):
                # Copy image to AI database
                ai_photo_filename = f"{report_id}{os.path.splitext(backend_photo_path)[1]}"
                ai_photo_path = os.path.join(DB_PATH, ai_photo_filename)

                shutil.copy2(backend_photo_path, ai_photo_path)

                # Create AI report entry
                ai_report = {
                    "report_id": report_id,
                    "backend_id": backend_report.get("_id"),
                    "user": backend_report.get("user"),
                    "person_name": backend_report.get("person_name"),
                    "age": backend_report.get("age"),
                    "gender": backend_report.get("gender"),
                    "last_seen": backend_report.get("last_seen"),
                    "description": backend_report.get("description", ""),
                    "relationToReporter": backend_report.get("relationToReporter", ""),
                    "reporterContact": backend_report.get("reporterContact", ""),
                    "familyEmail": backend_report.get("familyEmail", ""),
                    "photo_filename": ai_photo_filename,
                    "photo_path": f"uploads/reports/{ai_photo_filename}",
                    "status": backend_report.get("status", "Pending"),
                    "submitted_at": backend_report.get("reported_at", datetime.now().isoformat()),
                    "synced_from_backend": True,
                    "ai_ready": True
                }

                metadata["reports"][report_id] = ai_report
                synced_count += 1

        save_report_metadata(metadata)
        logger.info(f"Successfully synced {synced_count} reports from backend")

        return {
            "message": f"Successfully synced {synced_count} reports",
            "synced_count": synced_count
        }
    except Exception as e:
        logger.error(f"Error syncing reports: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sync error: {str(e)}")


@app.post("/find_match_react_native")
async def find_match_react_native(file_data: str = Form(...)):
    """
    Alternative endpoint for React Native file uploads.
    Expects base64 encoded image data.
    """
    import base64
    import time

    logger.info("Processing React Native file upload")

    try:
        # Decode base64 image data
        if file_data.startswith('data:image'):
            # Handle data URL format: data:image/jpeg;base64,/9j/4AAQ...
            header, base64_data = file_data.split(',', 1)
            image_data = base64.b64decode(base64_data)
            content_type = header.split(';')[0].split(':')[1]
        else:
            # Assume it's raw base64
            image_data = base64.b64decode(file_data)
            content_type = 'image/jpeg'

        # Create filename
        timestamp = str(int(time.time()))
        if 'png' in content_type:
            filename = f"rn_capture_{timestamp}.png"
        else:
            filename = f"rn_capture_{timestamp}.jpg"

        temp_file_path = os.path.join(TEMP_UPLOAD_PATH, filename)

        # Save decoded image
        with open(temp_file_path, "wb") as f:
            f.write(image_data)

        logger.info(f"Saved React Native image: {temp_file_path} ({len(image_data)} bytes)")

        # Now proceed with face matching
        return await process_face_match(temp_file_path, filename)

    except Exception as e:
        logger.error(f"Error processing React Native upload: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")


@app.post("/find_match")
async def find_match(file: UploadFile = File(None)):
    """
    Receives an uploaded image, searches for a matching face in the `DB_PATH`,
    and returns the result with enhanced metadata from reports.
    """
    logger.info(f"Received face search request - File object: {type(file)}")

    # If no file provided via File(...), try to get it from form data
    if not file:
        logger.info("No file via File(...), this might be normal for React Native")
        # For React Native, we'll handle this differently
        raise HTTPException(
            status_code=400,
            detail="No file uploaded. Try using /find_match_react_native for React Native apps."
        )

    # Debug: Log what we received
    logger.info(f"File filename: {file.filename}")
    logger.info(f"File content_type: {file.content_type}")

    # For React Native uploads, filename might be None, so we'll create one
    if not file.filename:
        import time
        timestamp = str(int(time.time()))
        if file.content_type and 'png' in file.content_type:
            file.filename = f"capture_{timestamp}.png"
        else:
            file.filename = f"capture_{timestamp}.jpg"
        logger.info(f"Generated filename: {file.filename}")

    # Validate file type
    allowed_extensions = {'.jpg', '.jpeg', '.png'}
    file_extension = os.path.splitext(file.filename.lower())[1]
    if file_extension not in allowed_extensions:
        logger.error(f"Invalid file type: {file_extension}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file_extension}. Only JPG, JPEG, and PNG are allowed."
        )

    # Create a unique temporary file path for the uploaded image.
    temp_file_path = os.path.join(TEMP_UPLOAD_PATH, file.filename)

    try:
        # Save the uploaded file to the temporary path.
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Search image '{file.filename}' saved to temporary path.")

        # Verify file was saved
        if not os.path.exists(temp_file_path):
            logger.error(f"Failed to save file to temporary path: {temp_file_path}")
            raise HTTPException(
                status_code=500,
                detail="Failed to save uploaded file."
            )

        file_size = os.path.getsize(temp_file_path)
        logger.info(f"File saved successfully. Size: {file_size} bytes")

        # Process the face match
        return await process_face_match(temp_file_path, file.filename)

    except Exception as e:
        logger.error(f"🔴 An unexpected server error occurred: {str(e)}")
        raise HTTPException(
            status_code=500, # Internal Server Error
            detail=f"An internal server error occurred: {str(e)}"
        )
    finally:
        # CRUCIAL: Clean up by deleting the temporary file after processing is complete,
        # whether it succeeded or failed.
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            logger.info(f"Cleaned up temporary file: {temp_file_path}")


async def process_face_match(temp_file_path: str, filename: str):
    """
    Common face matching logic used by both endpoints.
    """
    try:
        # Use DeepFace.find() to search for the face in the database.
        dfs = DeepFace.find(
            img_path=temp_file_path,
            db_path=DB_PATH,
            enforce_detection=False,
            model_name="VGG-Face"
        )

        # DeepFace returns a list of pandas DataFrames. We are interested in the first one.
        if not dfs or dfs[0].empty:
            logger.info(f"❌ No match found for '{filename}'.")
            return {"match_found": False, "message": "No similar face found in the database."}

        # If we reach here, at least one match was found.
        # The results are sorted by distance, so the first row is the best match.
        best_match = dfs[0].iloc[0]
        identity_path = best_match['identity']

        # Extract the filename to find the corresponding report
        matched_filename = os.path.basename(identity_path)
        report_id = os.path.splitext(matched_filename)[0]  # Remove extension

        # Load report metadata to get full details
        metadata = load_report_metadata()
        report_data = metadata.get("reports", {}).get(report_id)

        # Calculate a confidence score (1 - distance). Higher is better.
        confidence = 1 - float(best_match['distance'])

        logger.info(f"✅ Match found for '{filename}': {report_id} with confidence {confidence:.2f}")

        # Prepare response with enhanced report data
        response = {
            "match_found": True,
            "report_id": report_id,
            "confidence": confidence,
            "file_path": identity_path,
        }

        # Add report details if available
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
        # This specific error is often thrown by DeepFace if no face is detected in the input image.
        logger.warning(f"Face detection error for '{filename}': {str(e)}")
        raise HTTPException(
            status_code=400, # Bad Request
            detail=f"Could not find a face in the uploaded image. Please use a clearer photo. Error: {str(e)}"
        )


@app.delete("/reports/{report_id}")
async def delete_report(report_id: str):
    """Delete a report and its associated image."""
    try:
        metadata = load_report_metadata()
        report = metadata.get("reports", {}).get(report_id)

        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        # Remove the image file
        photo_path = os.path.join(DB_PATH, report.get("photo_filename", ""))
        if os.path.exists(photo_path):
            try:
                os.remove(photo_path)
                logger.info(f"Removed report image: {photo_path}")
            except Exception as e:
                logger.warning(f"Could not remove report image: {e}")

        # Remove from metadata
        del metadata["reports"][report_id]
        save_report_metadata(metadata)

        logger.info(f"Report {report_id} deleted successfully")

        return {
            "message": "Report deleted successfully",
            "report_id": report_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting report {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.get("/stats")
async def get_stats():
    """Get AI server statistics."""
    try:
        metadata = load_report_metadata()
        reports = metadata.get("reports", {})

        stats = {
            "total_reports": len(reports),
            "verified_reports": len([r for r in reports.values() if r.get("status") == "Verified"]),
            "pending_reports": len([r for r in reports.values() if r.get("status") == "Pending Verification"]),
            "rejected_reports": len([r for r in reports.values() if r.get("status") == "Rejected"]),
            "synced_from_backend": len([r for r in reports.values() if r.get("synced_from_backend")]),
            "database_path": DB_PATH,
            "temp_path": TEMP_UPLOAD_PATH,
            "metadata_path": METADATA_PATH
        }

        return stats
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


# --- 8. Start the Uvicorn Server ---
# This block allows you to run the script directly using `python main.py`.
if __name__ == "__main__":
    # host="0.0.0.0" makes the server accessible from other devices on your network (like your phone).
    # reload=True automatically restarts the server when you save changes to the code (great for development).
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)