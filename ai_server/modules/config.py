"""
Drishti Configuration Module
============================

Central configuration management for all system settings.
"""

import os

# --- Model Configuration ---
MODEL_NAME = "VGG-Face"
CONFIDENCE_THRESHOLD = 0.70
DETECTION_BACKENDS = ['retinaface', 'mtcnn', 'opencv', 'ssd']

# --- Image Processing Configuration ---
ENHANCE_IMAGES = True
MAX_IMAGE_SIZE = 1024

# --- Live Video Configuration ---
FRAME_SKIP = 30  # Process every 30th frame to reduce load
MIN_FACE_SIZE = 80  # Minimum face size for detection
MATCH_COOLDOWN = 3.0  # Seconds between matches for same person
MAX_RECENT_MATCHES = 10  # Maximum recent matches to remember

# --- File Paths Configuration ---
AI_SERVER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.abspath(os.path.join(AI_SERVER_DIR, "..", "backend"))
UPLOADS_DIR = os.path.join(BACKEND_DIR, "uploads")
DB_PATH = os.path.join(UPLOADS_DIR, "reports")
TEMP_UPLOAD_PATH = os.path.join(AI_SERVER_DIR, "temp_uploads")
UNIDENTIFIED_SIGHTINGS_PATH = os.path.join(UPLOADS_DIR, "unidentified_sightings")
CAPTURE_DIR = os.path.join(AI_SERVER_DIR, "capture")

# --- API Configuration ---
API_BASE_URL = "http://localhost:8000"
BACKEND_API_URL = "http://localhost:5000"