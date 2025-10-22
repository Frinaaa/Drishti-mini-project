# ai_server/modules/config.py
"""
Drishti Configuration Module
============================

Central configuration management for all system settings.
"""

import os

# --- Model Configuration ---
MODEL_NAME = "VGG-Face"
# This is for high-quality single image uploads (face-search)
CONFIDENCE_THRESHOLD = 0.40
# --- FINAL ADJUSTMENT: A more lenient threshold for real-time video ---
# We are seeing scores around 0.33, so let's set the bar just below that.
LIVE_STREAM_CONFIDENCE_THRESHOLD = 0.30
DETECTION_BACKENDS = ['retinaface', 'mtcnn', 'opencv', 'ssd']

# --- Image Processing Configuration ---
ENHANCE_IMAGES = True
MAX_IMAGE_SIZE = 1024

# --- Live Video Configuration ---
FRAME_SKIP = 30
MIN_FACE_SIZE = 80
MATCH_COOLDOWN = 5.0
MAX_RECENT_MATCHES = 10

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