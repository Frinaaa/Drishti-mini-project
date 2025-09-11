# /ai_server/main.py

import uvicorn
import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace

# --- 1. Initialize the FastAPI Application ---
app = FastAPI(title="Drishti AI DeepFace API")

# --- 2. Configure CORS ---
# Allows your React Native app to communicate with this server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# --- 3. Define Constants ---
# The folder where DeepFace will look for known faces.
DB_PATH = os.path.join(os.getcwd(), "database", "known_faces")
# A temporary folder to save the uploaded image for DeepFace to process.
TEMP_UPLOAD_PATH = os.path.join(os.getcwd(), "temp_uploads")

# --- 4. Application Startup: Pre-build the model ---
# This block runs when the server starts.
@app.on_event("startup")
async def startup_event():
    """
    Creates necessary directories and tells DeepFace to build its model once
    on startup. This makes the first API call much faster.
    """
    print("Server starting up...")
    # Create the database and temp folders if they don't exist
    os.makedirs(DB_PATH, exist_ok=True)
    os.makedirs(TEMP_UPLOAD_PATH, exist_ok=True)
    
    # This is a dummy call to force DeepFace to download and build the model.
    # It might take a moment the very first time you run the server.
    try:
        print("Pre-building DeepFace model... (This may take a moment on first run)")
        # Using a placeholder image to build the model
        dummy_image_path = os.path.join(DB_PATH, os.listdir(DB_PATH)[0]) if os.listdir(DB_PATH) else None
        if dummy_image_path:
            DeepFace.find(img_path=dummy_image_path, db_path=DB_PATH, enforce_detection=False)
            print("✅ DeepFace model built successfully.")
        else:
            print("⚠️ WARNING: 'known_faces' directory is empty. Add images to enable face matching.")
    except Exception as e:
        print(f"🔴 Could not pre-build DeepFace model: {e}")


# --- 5. Define API Endpoints ---
@app.get("/")
async def read_root():
    """ A simple health check endpoint. """
    return {"message": "Drishti AI DeepFace Server is running."}


@app.post("/find_match")
async def find_match(file: UploadFile = File(...)):
    """
    Receives an uploaded image and uses DeepFace to find a match in the database.
    """
    temp_file_path = None
    try:
        # Save the uploaded file temporarily
        temp_file_path = os.path.join(TEMP_UPLOAD_PATH, file.filename)
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print(f"Image received and saved to: {temp_file_path}")

        # Use DeepFace.find() to search for the face in the database folder.
        # It's highly efficient and searches all images in `db_path`.
        # `enforce_detection=False` prevents it from crashing if no face is found.
        # You can change the model_name to others like "Facenet", "VGG-Face", "ArcFace".
        dfs = DeepFace.find(
            img_path=temp_file_path, 
            db_path=DB_PATH, 
            enforce_detection=True, # Set to True to ensure a face is in the uploaded image
            model_name="VGG-Face"
        )
        
        # DeepFace.find returns a list of dataframes. We check the first one.
        if not dfs or dfs[0].empty:
            print("❌ No match found.")
            return {"match_found": False, "message": "No similar face found in the database."}

        # If we reach here, a match was found.
        # Get the details of the best match (the first row).
        best_match = dfs[0].iloc[0]
        identity_path = best_match['identity']
        
        # Extract just the filename to serve as the person's name/ID
        person_name = os.path.splitext(os.path.basename(identity_path))[0]
        
        print(f"✅ Match found: {person_name}")
        
        return {
            "match_found": True,
            "identity": person_name,
            "file_path": identity_path,
            "confidence": 1 - float(best_match['distance']) # Convert distance to a confidence score
        }

    except ValueError as e:
        # This error is often thrown by DeepFace if no face is detected in the uploaded image
        print(f"🔴 Face detection error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"🔴 An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {str(e)}")
    finally:
        # Clean up the temporary file after processing
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            print(f"Cleaned up temporary file: {temp_file_path}")


# --- 6. Start the Server ---
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)