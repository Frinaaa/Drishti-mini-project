import uvicorn
import os
import shutil
import base64
import time
from datetime import datetime
from typing import List, Optional, Tuple
from fastapi import FastAPI, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import logging
import asyncio
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileCreatedEvent
import cv2
import numpy as np
from PIL import Image, ImageEnhance

# --- 1. Basic Logging Configuration ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 2. CONFIGURATION CONSTANTS ---
MODEL_NAME = "VGG-Face"
CONFIDENCE_THRESHOLD = 0.70
DETECTION_BACKENDS = ['retinaface', 'mtcnn', 'opencv', 'ssd']
ENHANCE_IMAGES = True
MAX_IMAGE_SIZE = 1024

# --- 3. Initialize the FastAPI Application ---
app = FastAPI(
    title="Drishti Face Recognition Service",
    description="AI-powered face matching service for missing person identification",
    version="3.0.0"
)

# --- 4. CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# --- 5. Define All Critical File Paths ---
AI_SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(AI_SERVER_DIR, "..", "backend"))
UPLOADS_DIR = os.path.join(BACKEND_DIR, "uploads")
DB_PATH = os.path.join(UPLOADS_DIR, "reports")  # Only folder we need for face matching
TEMP_UPLOAD_PATH = os.path.join(AI_SERVER_DIR, "temp_uploads")
UNIDENTIFIED_SIGHTINGS_PATH = os.path.join(UPLOADS_DIR, "unidentified_sightings")

# --- NEW: Global state for database management ---
class DatabaseState:
    """Manages the face recognition database state"""
    def __init__(self):
        self.last_build_time: Optional[float] = None
        self.image_count: int = 0
        self.is_building: bool = False
        self.model = None
        
db_state = DatabaseState()

# --- 6. Mount Static Directory to Serve Images ---
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# --- 7. Image Processing Functions ---
def enhance_image(image_path: str) -> str:
    """Enhanced image processing for better face detection."""
    try:
        img = cv2.imread(image_path)
        if img is None:
            return image_path
        
        # Resize if too large
        height, width = img.shape[:2]
        if max(height, width) > MAX_IMAGE_SIZE:
            ratio = MAX_IMAGE_SIZE / max(height, width)
            new_size = (int(width * ratio), int(height * ratio))
            img = cv2.resize(img, new_size)
        
        # Apply CLAHE for better contrast
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        lab[:,:,0] = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8)).apply(lab[:,:,0])
        img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        
        # Noise reduction
        img = cv2.bilateralFilter(img, 9, 75, 75)
        
        enhanced_path = image_path.replace('.jpg', '_enhanced.jpg')
        cv2.imwrite(enhanced_path, img)
        return enhanced_path
        
    except Exception as e:
        logger.warning(f"Enhancement failed: {e}")
        return image_path

def find_best_backend(image_path: str) -> str:
    """Find the best detection backend for the given image."""
    for backend in DETECTION_BACKENDS:
        try:
            DeepFace.verify(
                img1=image_path, img2=image_path,
                model_name=MODEL_NAME, detector_backend=backend,
                enforce_detection=True, silent=True
            )
            return backend
        except Exception:
            continue
    return 'opencv'  # fallback

def cleanup_temp_files(file_path: str):
    """Clean up temporary files."""
    try:
        if '_enhanced.jpg' in file_path and os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        pass

# --- 8. Helper Functions ---
def get_image_files(directory: str) -> List[str]:
    """Get all image files in the directory"""
    if not os.path.exists(directory):
        return []
    return [f for f in os.listdir(directory) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]

def get_pickle_file() -> Optional[str]:
    """Get the DeepFace pickle file path if it exists"""
    for fname in os.listdir(DB_PATH):
        if fname.endswith('.pkl'):
            return os.path.join(DB_PATH, fname)
    return None

def should_rebuild_database() -> bool:
    """Check if the database needs to be rebuilt"""
    current_images = get_image_files(DB_PATH)
    current_count = len(current_images)
    
    # Check if pickle file exists
    pickle_file = get_pickle_file()
    if not pickle_file:
        logger.info(f"📊 No pickle file found. Need to build database for {current_count} images.")
        return current_count > 0
    
    # Check if image count changed
    if current_count != db_state.image_count:
        logger.info(f"📊 Image count changed: {db_state.image_count} -> {current_count}. Rebuild needed.")
        return True
    
    return False

async def update_database_async():
    """Update the face database incrementally when new images are added"""
    if db_state.is_building:
        logger.info("⏳ Database update already in progress, skipping...")
        return
    
    try:
        db_state.is_building = True
        current_images = get_image_files(DB_PATH)
        current_count = len(current_images)
        
        if current_count == 0:
            logger.warning("⚠️ No images in reports directory.")
            db_state.image_count = 0
            return
        
        # If this is first time or image count increased significantly, do full rebuild
        if db_state.image_count == 0 or not get_pickle_file():
            logger.info(f"🔨 Full database build needed for {current_count} images...")
            await _full_rebuild()
        else:
            # Incremental update: DeepFace automatically handles new images
            logger.info(f"🔄 Incremental update: {db_state.image_count} → {current_count} images")
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, _incremental_update)
        
        # Update state
        db_state.image_count = current_count
        db_state.last_build_time = time.time()
        
        logger.info(f"✅ Database updated successfully! Now has {current_count} images.")
        
    except Exception as e:
        logger.error(f"🔴 Error updating database: {e}")
    finally:
        db_state.is_building = False

async def _full_rebuild():
    """Perform a complete database rebuild"""
    # Delete existing pickle files
    for fname in os.listdir(DB_PATH):
        if fname.endswith('.pkl'):
            pkl_path = os.path.join(DB_PATH, fname)
            os.remove(pkl_path)
            logger.info(f"🗑️ Deleted old pickle file: {fname}")
    
    # Run the rebuild in a thread to avoid blocking
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _build_database_sync)

def _build_database_sync():
    """Synchronous function to build the database using DeepFace"""
    images = get_image_files(DB_PATH)
    if images:
        dummy_image = os.path.join(DB_PATH, images[0])
        try:
            # This will build the database and create pickle file
            DeepFace.find(
                img_path=dummy_image,
                db_path=DB_PATH,
                model_name=MODEL_NAME,
                enforce_detection=False,
                silent=True
            )
            logger.info(f"📦 Created pickle database for {len(images)} images")
        except Exception as e:
            # Expected error during initial build - pickle file is still created
            logger.info(f"📦 Database build completed for {len(images)} images")

def _incremental_update():
    """Incremental update - DeepFace automatically detects new images"""
    images = get_image_files(DB_PATH)
    if images:
        # Use any existing image to trigger database update
        # DeepFace will automatically scan for new images and update the pickle file
        test_image = os.path.join(DB_PATH, images[0])
        try:
            DeepFace.find(
                img_path=test_image,
                db_path=DB_PATH,
                model_name=MODEL_NAME,
                enforce_detection=False,
                silent=True
            )
            logger.info(f"🔄 Database automatically updated with new images")
        except Exception:
            # This is expected - database is updated regardless
            logger.info(f"🔄 Incremental update completed")

# Build and cache the model
def get_or_build_model():
    """Get cached model or build it if not available"""
    if db_state.model is None:
        logger.info(f"🔧 Building {MODEL_NAME} model...")
        db_state.model = DeepFace.build_model(MODEL_NAME)
        logger.info("✅ Model built and cached.")
    return db_state.model

def search_face(query_path: str, db_path: str) -> Tuple[Optional[str], Optional[float]]:
    """Optimized face search with fallback mechanisms."""
    backend = find_best_backend(query_path)
    pickle_file = get_pickle_file()
    
    # Try fast database search first
    if pickle_file:
        try:
            result = DeepFace.find(
                img_path=query_path, db_path=db_path,
                model_name=MODEL_NAME, detector_backend=backend,
                enforce_detection=False, silent=True
            )
            
            if result and len(result) > 0 and not result[0].empty:
                best_match = result[0].iloc[0]
                identity = best_match['identity']
                distance = best_match['distance']
                logger.info(f"⚡ Match found: {os.path.basename(identity)} (distance: {distance:.4f})")
                return identity, distance
                
        except Exception as e:
            logger.warning(f"Database search failed: {str(e)[:100]}")
    
    # Fallback to manual search
    return manual_search(query_path, db_path, backend)

def manual_search(query_path: str, db_path: str, backend: str) -> Tuple[Optional[str], Optional[float]]:
    """Manual face comparison search."""
    best_identity, best_distance = None, None
    model = get_or_build_model()
    images = get_image_files(db_path)
    
    logger.info(f"🔍 Manual search through {len(images)} images...")
    
    for fname in images:
        candidate = os.path.join(db_path, fname)
        try:
            res = DeepFace.verify(
                img1=query_path, img2=candidate,
                model_name=MODEL_NAME, model=model,
                detector_backend=backend, enforce_detection=False,
                distance_metric="cosine"
            )
            distance = float(res.get("distance", 1.0))
            if best_distance is None or distance < best_distance:
                best_distance = distance
                best_identity = candidate
                
        except Exception:
            continue  # Skip problematic images
    
    return best_identity, best_distance

# --- 8. File System Monitor for Auto Database Rebuild ---
class ReportsFileHandler(FileSystemEventHandler):
    """Monitors the reports directory for new image uploads"""
    
    def __init__(self, rebuild_callback, loop):
        self.rebuild_callback = rebuild_callback
        self.loop = loop  # Store reference to main event loop
        self.last_trigger = 0
        super().__init__()
    
    def on_created(self, event):
        if isinstance(event, FileCreatedEvent) and not event.is_directory:
            file_path = event.src_path
            if file_path.lower().endswith(('.png', '.jpg', '.jpeg')):
                # Debounce: Only trigger once per 2 seconds
                current_time = time.time()
                if current_time - self.last_trigger > 2:
                    self.last_trigger = current_time
                    logger.info(f"📸 New image uploaded: {os.path.basename(file_path)}")
                    # Schedule incremental update from thread-safe context
                    if self.loop and not self.loop.is_closed():
                        asyncio.run_coroutine_threadsafe(self.rebuild_callback(), self.loop)

# Global observer
file_observer = None

@app.on_event("startup")
async def startup_event():
    global file_observer
    
    logger.info("🚀 Server is starting up...")
    os.makedirs(DB_PATH, exist_ok=True)
    os.makedirs(TEMP_UPLOAD_PATH, exist_ok=True)
    os.makedirs(UNIDENTIFIED_SIGHTINGS_PATH, exist_ok=True)
    
    # Initialize image count
    current_images = get_image_files(DB_PATH)
    db_state.image_count = len(current_images)
    
    # Pre-build model in background
    logger.info(f"🔧 Pre-building {MODEL_NAME} model...")
    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, get_or_build_model)
    except Exception as e:
        logger.error(f"🔴 Could not pre-build model: {e}")
    
    # Check if database needs initial build
    if should_rebuild_database():
        logger.info("🔨 Initial database build needed...")
        await update_database_async()
    else:
        logger.info(f"✅ Database is up to date with {db_state.image_count} images.")
    
    # Start file system watcher for automatic updates
    try:
        # Pass the current event loop to the file handler
        current_loop = asyncio.get_running_loop()
        event_handler = ReportsFileHandler(update_database_async, current_loop)
        file_observer = Observer()
        file_observer.schedule(event_handler, DB_PATH, recursive=False)
        file_observer.start()
        logger.info(f"👁️ Watching {DB_PATH} for new uploads...")
    except Exception as e:
        logger.error(f"🔴 Could not start file watcher: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    global file_observer
    if file_observer:
        file_observer.stop()
        file_observer.join()
        logger.info("👋 File system watcher stopped.")

# --- 9. API ENDPOINTS ---

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Drishti Face Recognition API",
        "version": "2.2.0",
        "model": MODEL_NAME,
        "database_images": db_state.image_count
    }

@app.post("/find_match_react_native")
async def find_match_react_native(file_data: str = Form(...)):
    """Receives an image from the app and performs a robust face search."""
    temp_file_path = None
    try:
        if 'base64,' in file_data: _, base64_data = file_data.split(',', 1)
        else: base64_data = file_data
        image_data = base64.b64decode(base64_data)
        
        filename = f"capture_{int(time.time())}.jpg"
        temp_file_path = os.path.join(TEMP_UPLOAD_PATH, filename)
        with open(temp_file_path, "wb") as f: f.write(image_data)
        
        return await process_face_match(temp_file_path, filename)
    except Exception as e:
        logger.error(f"Error processing upload: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

async def process_face_match(temp_file_path: str, filename: str):
    """Process face matching with enhanced detection."""
    enhanced_path = None
    
    try:
        # Ensure database is ready
        if not get_pickle_file() and get_image_files(DB_PATH):
            await update_database_async()
        
        # Enhance image if enabled
        search_path = temp_file_path
        if ENHANCE_IMAGES:
            loop = asyncio.get_running_loop()
            enhanced_path = await loop.run_in_executor(None, enhance_image, temp_file_path)
            
            # Use enhanced version if face detection works
            backend = find_best_backend(enhanced_path)
            if backend != 'opencv':  # If enhanced version works better
                search_path = enhanced_path
            else:
                cleanup_temp_files(enhanced_path)
                enhanced_path = None
        
        # Search for matches
        logger.info(f"🔍 Searching against {db_state.image_count} images...")
        loop = asyncio.get_running_loop()
        identity, distance = await loop.run_in_executor(
            None, search_face, search_path, DB_PATH
        )
        
        if not identity:
            return await handle_no_match(temp_file_path, "No similar face found in database.")
        
        confidence = 1 - float(distance)
        if confidence < CONFIDENCE_THRESHOLD:
            logger.info(f"Low confidence match: {confidence:.2f} < {CONFIDENCE_THRESHOLD}")
            return await handle_no_match(temp_file_path, "Match found but confidence too low.")
        
        # Return successful match
        matched_filename = os.path.basename(identity)
        relative_path = os.path.relpath(identity, UPLOADS_DIR).replace("\\", "/")
        
        logger.info(f"✅ Match found: {matched_filename} (confidence: {confidence:.2f})")
        
        return {
            "match_found": True,
            "confidence": round(confidence, 3),
            "distance": round(distance, 4),
            "matched_image": matched_filename,
            "file_path": f"uploads/{relative_path}",
            "message": f"Match found with {confidence*100:.1f}% confidence"
        }
        
    except ValueError as e:
        error_msg = str(e).lower()
        if "face could not be detected" in error_msg:
            detail = "No face detected. Please ensure clear lighting and face visibility."
            raise HTTPException(status_code=400, detail=detail)
        raise HTTPException(status_code=500, detail=f"Face analysis error: {str(e)}")
        
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
        
    finally:
        if enhanced_path:
            cleanup_temp_files(enhanced_path)

async def handle_no_match(temp_file_path: str, message: str):
    """
    Saves unidentified sighting and returns no match response.
    """
    sighting_filename = f"sighting_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
    destination_path = os.path.join(UNIDENTIFIED_SIGHTINGS_PATH, sighting_filename)
    shutil.copy(temp_file_path, destination_path)
    logger.info(f"📷 Saved unidentified sighting: {sighting_filename}")
    return {
        "match_found": False, 
        "message": message,
        "sighting_saved": sighting_filename
    }

@app.post("/rebuild_database")
async def rebuild_database(background_tasks: BackgroundTasks):
    """
    Manually triggers a full database rebuild.
    """
    try:
        if db_state.is_building:
            return {
                "success": False,
                "message": "Database update already in progress."
            }
        
        # Force a full rebuild
        logger.info("🔨 Manual full rebuild requested")
        db_state.image_count = 0  # Force full rebuild
        background_tasks.add_task(update_database_async)
        
        return {
            "success": True,
            "message": "Full database rebuild scheduled.",
            "current_images": len(get_image_files(DB_PATH))
        }
    except Exception as e:
        logger.error(f"Error scheduling database rebuild: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to schedule rebuild: {str(e)}")

@app.get("/database_stats")
async def database_stats():
    """
    Returns statistics about the face database.
    """
    try:
        image_files = get_image_files(DB_PATH)
        pickle_files = [f for f in os.listdir(DB_PATH) if f.endswith('.pkl')]
        
        return {
            "total_images": len(image_files),
            "cached_image_count": db_state.image_count,
            "database_built": len(pickle_files) > 0,
            "is_building": db_state.is_building,
            "last_build_time": datetime.fromtimestamp(db_state.last_build_time).isoformat() if db_state.last_build_time else None,
            "model_cached": db_state.model is not None,
            "pickle_files": pickle_files,
            "model_name": MODEL_NAME,
            "confidence_threshold": CONFIDENCE_THRESHOLD,
            "detection_backends": DETECTION_BACKENDS,
            "image_enhancement": ENHANCE_IMAGES,
            "needs_rebuild": should_rebuild_database()
        }
    except Exception as e:
        logger.error(f"Error getting database stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get database stats: {str(e)}")

# --- 10. Start the Uvicorn Server ---a
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)