# /ai_server/main.py

import uvicorn
import os
import random
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# --- 1. Initialize the FastAPI Application ---
app = FastAPI(title="Drishti AI Face Recognition API (Simulated)")


# --- 2. Configure CORS (Cross-Origin Resource Sharing) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- 3. Load Known Faces on Startup (Simulated) ---
# This part scans the 'known_faces' directory to get the names of known individuals.
# The actual face encoding process is skipped in this simulated version.
known_face_names = []

KNOWN_FACES_DIR = "known_faces"
print(f"Loading known faces from '{KNOWN_FACES_DIR}' (Simulated)...")

# Create the directory if it doesn't exist to prevent errors on startup
if not os.path.isdir(KNOWN_FACES_DIR):
    print(f"  - WARNING: Directory '{KNOWN_FACES_DIR}' not found. Creating it.")
    os.makedirs(KNOWN_FACES_DIR)
    print("  - Please add images of known people (e.g., 'YourName.jpg') to this directory.")

for filename in os.listdir(KNOWN_FACES_DIR):
    if filename.endswith((".jpg", ".png", ".jpeg")):
        try:
            # In this simulation, we only care about the names, not the image data.
            # The name is derived from the filename without the extension.
            name = os.path.splitext(filename)[0]
            known_face_names.append(name)
            print(f"  - Loaded simulated identity for: {name}")
        except Exception as e:
            print(f"  - ERROR processing {filename}: {e}")

if not known_face_names:
     print("  - WARNING: No known faces found. The API will not be able to find any matches.")
else:
    print(f"✅ {len(known_face_names)} known identities loaded successfully.")


# --- 4. Define API Endpoints ---

@app.get("/")
async def read_root():
    """ A simple endpoint to check if the server is running. """
    return {"message": "Drishti AI Face Recognition Server is running (Simulated Mode)."}


@app.post("/match_face")
async def match_face(file: UploadFile = File(...)):
    """
    Receives an uploaded image and **simulates** a face match.

    **Simulation Logic:**
    - It checks if the uploaded filename (without extension) matches any of the
      filenames in the 'known_faces' directory.
    - For example, uploading `elon_musk.jpg` will result in a match if a file
      like `elon_musk.png` exists on the server.
    - This allows for predictable testing without a real AI model.
    """
    try:
        # --- SIMULATION LOGIC STARTS HERE ---
        # We don't need to read or process the image bytes for the simulation.
        # We just use the filename to determine the outcome.
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file was uploaded.")

        # Extract the name from the uploaded file (e.g., "elon_musk.jpg" -> "elon_musk")
        name_to_check = os.path.splitext(file.filename)[0]
        
        print(f"🔍 Received file: '{file.filename}'. Checking for a match with '{name_to_check}'...")

        # Check if the extracted name exists in our list of known names
        if name_to_check in known_face_names:
            # Simulate a successful match
            # Generate a random high similarity score to make it feel more realistic
            simulated_score = 1 - random.uniform(0.05, 0.25)
            
            print(f"✅ Match found (Simulated): {name_to_check} with a score of {simulated_score:.2f}")
            return {
                "match": True,
                "name": name_to_check,
                "similarity_score": simulated_score
            }
        else:
            # If the name doesn't match any known name, simulate a failure
            print(f"❌ No match found for '{name_to_check}'.")
            return {
                "match": False,
                "reason": "No similar face found in the database (Simulated)."
            }
        # --- SIMULATION LOGIC ENDS HERE ---

    except Exception as e:
        print(f"🔴 An error occurred during simulated matching: {e}")
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {str(e)}")


# --- 5. Start the Server ---
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)