"""
Drishti Face Recognition Service - Final Version
================================================

AI-powered face matching service for missing person identification.
Features modular architecture and live video streaming via WebSockets.
"""

import uvicorn
import os
import shutil
import base64
import time
import asyncio
import logging
from datetime import datetime
from fastapi import FastAPI, Form, HTTPException, BackgroundTasks, WebSocket
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
)
from modules.image_processor import ImageProcessor
from modules.database_manager import DatabaseManager
from modules.face_recognition import FaceRecognizer
from modules.file_monitor import FileSystemMonitor
from modules.live_stream_handler import LiveStreamHandler

# --- Logging Configuration ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("Drishti")

# --- Initialize the FastAPI Application ---
app = FastAPI(
    title="Drishti Face Recognition Service",
    description="AI-powered face matching service with live WebSocket video capabilities",
    version="5.0.0"
)

# --- CORS Configuration ---
# This is a critical step for development. It allows your React Native web app (and mobile app)
# to connect to the server from a different origin (e.g., localhost:8081 -> localhost:8000).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Mount Static Directory to Serve Images ---
# This makes the 'uploads' folder publicly accessible at http://<server_ip>:8000/uploads/
# It's how the frontend fetches the matched database images.
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# --- Initialize Modular Components ---
# Create single instances of our modules to be used throughout the application.
image_processor = ImageProcessor()
database_manager = DatabaseManager()
face_recognizer = FaceRecognizer(database_manager)
file_monitor = FileSystemMonitor(database_manager, DB_PATH)

# --- Utility Functions ---
async def handle_no_match(temp_file_path: str, message: str):
    """Saves a photo from a failed match attempt for later review."""
    sighting_filename = f"sighting_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
    destination_path = os.path.join(UNIDENTIFIED_SIGHTINGS_PATH, sighting_filename)
    shutil.copy(temp_file_path, destination_path)
    logger.info(f"Saved unidentified sighting: {sighting_filename}")
    return {"match_found": False, "message": message, "sighting_saved": sighting_filename}

# --- Application Lifecycle Events ---
@app.on_event("startup")
async def startup_event():
    """Runs once when the server starts."""
    logger.info("🚀 Drishti Server is starting up...")
    
    # Ensure all necessary directories exist
    for path in [DB_PATH, TEMP_UPLOAD_PATH, UNIDENTIFIED_SIGHTINGS_PATH, CAPTURE_DIR]:
        os.makedirs(path, exist_ok=True)

    current_images = image_processor.get_image_files(DB_PATH)
    database_manager.state.image_count = len(current_images)
    logger.info(f"Database initialized with {database_manager.state.image_count} images.")
    
    # Pre-build the AI model to avoid a long delay on the first request
    logger.info(f"Pre-building {MODEL_NAME} model...")
    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, database_manager.get_or_build_model)
    except Exception as e:
        logger.error(f"Could not pre-build model: {e}")

    # Build or verify the face database index (.pkl file)
    if database_manager.should_rebuild_database():
        logger.info("Database build/update needed...")
        await database_manager.update_database_async()
    else:
        logger.info("Database is up to date.")

    # Start watching the reports folder for new images
    current_loop = asyncio.get_running_loop()
    if file_monitor.start_monitoring(current_loop):
        logger.info("File system monitoring started")

@app.on_event("shutdown")
async def shutdown_event():
    """Runs once when the server shuts down."""
    file_monitor.stop_monitoring()
    logger.info("🛑 Application shutdown completed")

# --- HTTP API ENDPOINTS ---
@app.get("/")
async def root():
    """A simple health check endpoint."""
    return { "status": "online", "service": "Drishti Face Recognition API", "version": "5.0.0" }

@app.post("/find_match_react_native")
async def find_match_react_native(file_data: str = Form(...)):
    """Legacy endpoint for single, file-based image uploads."""
    temp_file_path = None
    try:
        if 'base64,' in file_data:
            _, base64_data = file_data.split(',', 1)
        else:
            base64_data = file_data
        image_data = base64.b64decode(base64_data)

        filename = f"capture_{int(time.time())}.jpg"
        temp_file_path = os.path.join(TEMP_UPLOAD_PATH, filename)
        with open(temp_file_path, "wb") as f:
            f.write(image_data)

        result = await face_recognizer.process_face_match(temp_file_path, filename)

        if not result.get("match_found"):
            return await handle_no_match(temp_file_path, result.get("message", "No match found"))
        
        # This part ensures the full URL path is included in the response for this endpoint too
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
    if database_manager.state.is_building:
        return {"success": False, "message": "Database update already in progress."}
    
    logger.info("Manual full rebuild requested")
    database_manager.state.image_count = 0
    background_tasks.add_task(database_manager.update_database_async)
    
    return {"success": True, "message": "Full database rebuild scheduled."}

@app.get("/database_stats")
async def database_stats():
    """Returns comprehensive statistics about the face database."""
    stats = database_manager.get_database_stats()
    stats.update({
        "model_name": MODEL_NAME,
        "confidence_threshold": CONFIDENCE_THRESHOLD
    })
    if stats.get("last_build_time"):
        stats["last_build_time"] = datetime.fromtimestamp(stats["last_build_time"]).isoformat()
    return stats

# --- LIVE VIDEO WEBSOCKET ENDPOINT ---
@app.websocket("/ws/live_stream")
async def websocket_live_stream(websocket: WebSocket):
    """
    The primary endpoint for the live scanning feature.
    It accepts a WebSocket connection and passes it to a dedicated handler.
    """
    handler = LiveStreamHandler(face_recognizer, image_processor)
    await handler.handle_websocket(websocket)

# --- Server Entry Point ---
if __name__ == "__main__":
    print("===========================================")
    print("🚀 Starting Drishti Face Recognition Service v5.0.0")
    print("Features: Modular Architecture + Live WebSocket Streaming")
    print("Server will be available at: http://localhost:8000")
    print("===========================================")
    # host="0.0.0.0" is essential for making the server accessible on your local network
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)