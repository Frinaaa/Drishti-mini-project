from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import face_recognition
import numpy as np

app = FastAPI()

# Enable CORS (allow Node.js / React Native access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the stored face encoding
known_encoding = np.load('known_face.npy')

@app.post("/match_face")
async def match_face(file: UploadFile = File(...)):
    try:
        # Read uploaded image
        img = face_recognition.load_image_file(file.file)
        encodings = face_recognition.face_encodings(img)

        if not encodings:
            return {"match": False, "reason": "No face detected"}

        uploaded_encoding = encodings[0]
        distance = np.linalg.norm(uploaded_encoding - known_encoding)

        return {
            "match": distance < 0.6,
            "distance": float(distance)
        }
    except Exception as e:
        return {"match": False, "error": str(e)}
