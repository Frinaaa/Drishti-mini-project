"""
Drishti Face Recognition Service - Modularized Version
======================================================

AI-powered face matching service for missing person identification.
Features modular architecture and live video matching capabilities.

Version: 4.0.1
Author: Drishti Team
"""

import uvicorn
import os
import shutil
import base64
import time
import asyncio
import logging
from datetime import datetime
from fastapi import FastAPI, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Import modular components
from modules.config import (
    UPLOADS_DIR,
    DB_PATH,
    TEMP_UPLOAD_PATH,
    UNIDENTIFIED_SIGHTINGS_PATH,
    CAPTURE_DIR,
    MODEL_NAME,
    CONFIDENCE_THRESHOLD,
    DETECTION_BACKENDS,
    ENHANCE_IMAGES,
)
from modules.image_processor import ImageProcessor
from modules.database_manager import DatabaseManager
from modules.face_recognition import FaceRecognizer
from modules.file_monitor import FileSystemMonitor
from modules.live_video import LiveVideoMatcher

# --- Logging Configuration ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("Drishti")

# --- Initialize the FastAPI Application ---
app = FastAPI(
    title="Drishti Face Recognition Service",
    description="AI-powered face matching service with live video capabilities",
    version="4.0.1"
)

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[""], allow_credentials=True, allow_methods=[""], allow_headers=["*"],
)

# --- Mount Static Directory to Serve Images ---
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# --- Initialize Modular Components ---
image_processor = ImageProcessor()
database_manager = DatabaseManager()
face_recognizer = FaceRecognizer(database_manager)
live_video_matcher = LiveVideoMatcher(face_recognizer)
file_monitor = FileSystemMonitor(database_manager, DB_PATH)

# --- Utility Functions ---
async def handle_no_match(temp_file_path: str, message: str):
    """
    Saves unidentified sighting and returns no match response.
    """
    sighting_filename = f"sighting_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
    destination_path = os.path.join(UNIDENTIFIED_SIGHTINGS_PATH, sighting_filename)
    shutil.copy(temp_file_path, destination_path)
    logger.info(f"Saved unidentified sighting: {sighting_filename}")
    return {
        "match_found": False,
        "message": message,
        "sighting_saved": sighting_filename
    }

# --- Application Startup & Shutdown ---
@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup"""
    logger.info("🚀 Drishti Server is starting up...")

    # Create required directories
    for path in [DB_PATH, TEMP_UPLOAD_PATH, UNIDENTIFIED_SIGHTINGS_PATH, CAPTURE_DIR]:
        os.makedirs(path, exist_ok=True)

    # Initialize image count
    current_images = image_processor.get_image_files(DB_PATH)
    database_manager.state.image_count = len(current_images)
    logger.info(f"Database initialized with {database_manager.state.image_count} images.")

    # Pre-build model in background
    logger.info(f"Pre-building {MODEL_NAME} model...")
    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, database_manager.get_or_build_model)
    except Exception as e:
        logger.error(f"Could not pre-build model: {e}")

    # Check if database needs initial build
    if database_manager.should_rebuild_database():
        logger.info("Initial database build needed...")
        await database_manager.update_database_async()
    else:
        logger.info("Database is up to date.")

    # Start file system watcher for automatic updates
    current_loop = asyncio.get_running_loop()
    if file_monitor.start_monitoring(current_loop):
        logger.info("File system monitoring started")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown"""
    file_monitor.stop_monitoring()
    if hasattr(live_video_matcher, 'cleanup'):
        live_video_matcher.cleanup()
    logger.info("🛑 Application shutdown completed")

# --- API ENDPOINTS ---

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Drishti Face Recognition API",
        "version": "4.0.1",
        "model": MODEL_NAME,
        "database_images": database_manager.state.image_count,
        "features": ["face_recognition", "live_video_matching", "auto_database_updates"]
    }

@app.post("/find_match_react_native")
async def find_match_react_native(file_data: str = Form(...)):
    """Receives an image from the app and performs a robust face search."""
    temp_file_path = None
    try:
        # Decode Base64 image
        if 'base64,' in file_data:
            _, base64_data = file_data.split(',', 1)
        else:
            base64_data = file_data
        image_data = base64.b64decode(base64_data)

        # Save temporarily
        filename = f"capture_{int(time.time())}.jpg"
        temp_file_path = os.path.join(TEMP_UPLOAD_PATH, filename)
        with open(temp_file_path, "wb") as f:
            f.write(image_data)

        # Process with modular face recognizer
        result = await face_recognizer.process_face_match(temp_file_path, filename)

        # Handle no match case
        if not result.get("match_found"):
            return await handle_no_match(temp_file_path, result.get("message", "No match found"))

        # Add file path for successful matches
        if result.get("matched_image"):
            identity_path = os.path.join(DB_PATH, result["matched_image"])
            if os.path.exists(identity_path):
                relative_path = os.path.relpath(identity_path, UPLOADS_DIR).replace("\\", "/")
                result["file_path"] = f"uploads/{relative_path}"

        return result

    except Exception as e:
        logger.error(f"Error processing upload: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.post("/rebuild_database")
async def rebuild_database(background_tasks: BackgroundTasks):
    """Manually triggers a full database rebuild."""
    try:
        if database_manager.state.is_building:
            return {
                "success": False,
                "message": "Database update already in progress."
            }

        # Force a full rebuild
        logger.info("Manual full rebuild requested")
        database_manager.state.image_count = 0
        background_tasks.add_task(database_manager.update_database_async)

        return {
            "success": True,
            "message": "Full database rebuild scheduled.",
            "current_images": len(image_processor.get_image_files(DB_PATH))
        }
    except Exception as e:
        logger.error(f"Error scheduling database rebuild: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to schedule rebuild: {str(e)}")

@app.get("/database_stats")
async def database_stats():
    """Returns comprehensive statistics about the face database."""
    try:
        stats = database_manager.get_database_stats()

        stats.update({
            "model_name": MODEL_NAME,
            "confidence_threshold": CONFIDENCE_THRESHOLD,
            "detection_backends": DETECTION_BACKENDS,
            "image_enhancement": ENHANCE_IMAGES,
            "live_video_enabled": True
        })

        if stats.get("last_build_time"):
            stats["last_build_time"] = datetime.fromtimestamp(stats["last_build_time"]).isoformat()

        return stats
    except Exception as e:
        logger.error(f"Error getting database stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get database stats: {str(e)}")

# --- LIVE VIDEO ENDPOINTS ---

@app.post("/start_live_video")
async def start_live_video(background_tasks: BackgroundTasks):
    """Start live video matching in background"""
    try:
        if getattr(live_video_matcher, 'running', False):
            return {
                "success": False,
                "message": "Live video matching is already running"
            }

        # Reset state
        live_video_matcher.running = True
        live_video_matcher.frame_count = 0
        live_video_matcher.processed_frames = 0
        live_video_matcher.recent_matches.clear()

        # Start in background
        background_tasks.add_task(live_video_matcher.run_live_matching)

        return {"success": True, "message": "Live video matching started"}
    except Exception as e:
        logger.error(f"Error starting live video: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start live video: {str(e)}")

@app.post("/stop_live_video")
async def stop_live_video():
    """Stop live video matching"""
    try:
        live_video_matcher.running = False
        live_video_matcher.cleanup()
        return {"success": True, "message": "Live video matching stopped"}
    except Exception as e:
        logger.error(f"Error stopping live video: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop live video: {str(e)}")

@app.get("/live_video_stats")
async def live_video_stats():
    """Get live video matching statistics"""
    try:
        return {
            "running": getattr(live_video_matcher, 'running', False),
            "total_frames": getattr(live_video_matcher, 'total_frames', 0),
            "processed_frames": getattr(live_video_matcher, 'processed_frames', 0),
            "fps": live_video_matcher.get_fps() if hasattr(live_video_matcher, 'get_fps') else 0,
            "recent_matches": list(live_video_matcher.recent_matches) if hasattr(live_video_matcher, 'recent_matches') else [],
            "processing": getattr(live_video_matcher, 'processing', False)
        }
    except Exception as e:
        logger.error(f"Error getting live video stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get live video stats: {str(e)}")

# --- Server Entry Point ---
if _name_ == "_main_":
    print("===========================================")
    print("🚀 Starting Drishti Face Recognition Service v4.0.1")
    print("Features: Modular Architecture + Live Video Matching")
    print("Server will be available at: http://localhost:8000")
    print("===========================================")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)