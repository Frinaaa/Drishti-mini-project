# /ai_server/main.py

import uvicorn
import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace
import logging

# --- 1. Basic Logging Configuration ---
# Helps in debugging and monitoring the server's activity.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 2. Initialize the FastAPI Application ---
app = FastAPI(
    title="Drishti AI Face Matching API",
    description="An API that uses DeepFace to find matches for missing persons.",
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

# Define the path to the database of known faces (NGO report photos).
# This path navigates up one level from `ai_server` and then into `backend/uploads/reports`.
# Using abspath ensures it works regardless of where you run the server from.
DB_PATH = os.path.abspath(os.path.join(AI_SERVER_DIR, "..", "backend", "uploads", "reports"))

# Define a path for temporarily storing uploaded images for processing.
TEMP_UPLOAD_PATH = os.path.join(AI_SERVER_DIR, "temp_uploads")


# --- 5. Application Startup Logic ---
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


# --- 6. Define API Endpoints ---
@app.get("/")
async def read_root():
    """ A simple health-check endpoint to confirm the server is running. """
    return {"message": "Drishti AI Face Matching Server is online and running."}


@app.post("/find_match")
async def find_match(file: UploadFile = File(...)):
    """
    Receives an uploaded image, searches for a matching face in the `DB_PATH`,
    and returns the result.
    """
    # Create a unique temporary file path for the uploaded image.
    temp_file_path = os.path.join(TEMP_UPLOAD_PATH, file.filename)

    try:
        # Save the uploaded file to the temporary path.
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Image '{file.filename}' received and saved to temporary path.")

        # Use DeepFace.find() to search for the face in the database.
        # - enforce_detection=True: Ensures the API returns an error if no face is found in the uploaded image.
        # - model_name: Can be changed to "Facenet", "ArcFace", etc., but VGG-Face is a good default.
        # - distance_metric: Cosine similarity is common for VGG-Face.
        dfs = DeepFace.find(
            img_path=temp_file_path,
            db_path=DB_PATH,
            enforce_detection=True,
            model_name="VGG-Face"
        )

        # DeepFace returns a list of pandas DataFrames. We are interested in the first one.
        if not dfs or dfs[0].empty:
            logger.info(f"❌ No match found for '{file.filename}'.")
            return {"match_found": False, "message": "No similar face found in the database."}

        # If we reach here, at least one match was found.
        # The results are sorted by distance, so the first row is the best match.
        best_match = dfs[0].iloc[0]
        identity_path = best_match['identity']

        # Extract just the filename (without extension) to serve as the person's ID.
        # This filename corresponds to the image name from the missing person report.
        person_id = os.path.splitext(os.path.basename(identity_path))[0]

        # Calculate a confidence score (1 - distance). Higher is better.
        confidence = 1 - float(best_match['distance'])

        logger.info(f"✅ Match found for '{file.filename}': {person_id} with confidence {confidence:.2f}")

        return {
            "match_found": True,
            "identity": person_id,
            "confidence": confidence,
            "file_path": identity_path # The full path to the matched image on the server
        }

    except ValueError as e:
        # This specific error is often thrown by DeepFace if no face is detected in the input image.
        logger.warning(f"Face detection error for '{file.filename}': {str(e)}")
        raise HTTPException(
            status_code=400, # Bad Request
            detail=f"Could not find a face in the uploaded image. Please use a clearer photo. Error: {str(e)}"
        )
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


# --- 7. Start the Uvicorn Server ---
# This block allows you to run the script directly using `python main.py`.
if __name__ == "__main__":
    # host="0.0.0.0" makes the server accessible from other devices on your network (like your phone).
    # reload=True automatically restarts the server when you save changes to the code (great for development).
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)