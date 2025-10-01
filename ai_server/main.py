import uvicorn
import os
import shutil
import base64
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from deepface import DeepFace
import logging
import asyncio
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileCreatedEvent

# --- 1. Basic Logging Configuration ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 2. CONFIGURATION CONSTANTS (FOR EASY TUNING) ---
# --- NEW ---: Model choice is now a configurable variable.
# Experiment with "ArcFace", "FaceNet", "DeepFace" for potentially better accuracy.
MODEL_NAME = "VGG-Face"

# --- NEW ---: Confidence threshold to prevent false positives.
# A match is only considered valid if the confidence is ABOVE this value.
# VGG-Face and FaceNet are often good around 0.75-0.80. ArcFace is stricter.
CONFIDENCE_THRESHOLD = 0.75

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

# --- 7. Helper Functions ---
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

def optimized_search(query_path: str, db_path: str):
    """
    Fast search using pre-built DeepFace database (pickle file).
    Falls back to manual search if pickle file has issues.
    """
    pickle_file = get_pickle_file()
    
    if pickle_file:
        # Try using the pre-built database first (fastest method)
        try:
            result = DeepFace.find(
                img_path=query_path,
                db_path=db_path,
                model_name=MODEL_NAME,
                enforce_detection=False,
                silent=True
            )
            
            if result and len(result) > 0 and not result[0].empty:
                best_match = result[0].iloc[0]
                best_identity = best_match['identity']
                best_distance = best_match['distance']
                logger.info(f"⚡ Fast match: {os.path.basename(best_identity)} (distance: {best_distance:.4f})")
                return best_identity, best_distance
            else:
                logger.info("🔍 No match found in database")
                return None, None
                
        except Exception as e:
            logger.warning(f"⚠️ Pickle search failed, falling back to manual: {str(e)[:100]}")
            # Fall through to manual search
    
    # Fallback: Manual search with cached model
    return manual_search_fallback(query_path, db_path)

def manual_search_fallback(query_path: str, db_path: str):
    """
    Manual search using cached model (fallback when pickle fails).
    """
    best_identity = None
    best_distance = None
    
    try:
        model = get_or_build_model()
    except Exception as e:
        logger.error(f"Failed to build model: {e}")
        raise e

    images = get_image_files(db_path)
    logger.info(f"🔍 Manual search through {len(images)} images...")
    
    for fname in images:
        candidate = os.path.join(db_path, fname)
        try:
            res = DeepFace.verify(
                img1=query_path, 
                img2=candidate, 
                model_name=MODEL_NAME,
                model=model,
                enforce_detection=False,
                distance_metric="cosine"
            )
            dist = float(res.get("distance", 1.0))
            if best_distance is None or dist < best_distance:
                best_distance = dist
                best_identity = candidate
        except Exception as e:
            # Skip problematic images
            logger.debug(f"Skipped {fname}: {str(e)[:50]}")
            continue

    if best_identity:
        logger.info(f"✅ Manual match: {os.path.basename(best_identity)} (distance: {best_distance:.4f})")
    
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
    """
    Optimized face matching using cached database and model.
    """
    try:
        # Quick check if database is ready
        if not get_pickle_file() and get_image_files(DB_PATH):
            logger.info("⚠️ Database not ready, building now...")
            await update_database_async()
        
        # Use optimized search with pre-built database
        logger.info(f"🔍 Searching against {db_state.image_count} images...")
        loop = asyncio.get_running_loop()
        best_identity, best_distance = await loop.run_in_executor(
            None, 
            optimized_search, 
            temp_file_path, 
            DB_PATH
        )
        
        if not best_identity:
            return await handle_no_match(temp_file_path, "No similar face found in database.")
        
        identity_path = best_identity
        distance_val = best_distance
        confidence = 1 - float(distance_val)

        # --- NEW ---: Implementing the confidence threshold check.
        if confidence < CONFIDENCE_THRESHOLD:
            logger.info(f"Match found, but confidence {confidence:.2f} is below threshold of {CONFIDENCE_THRESHOLD}.")
            return await handle_no_match(temp_file_path, "A potential match was found, but with low confidence.")

        # If we reach here, the match is considered valid.
        relative_path = os.path.relpath(identity_path, UPLOADS_DIR).replace("\\", "/")
        matched_filename = os.path.basename(identity_path)

        logger.info(f"✅ High-confidence match found: {matched_filename} with confidence {confidence:.2f}")
        return {
            "match_found": True,
            "matched_image": matched_filename,  # Return filename for Node.js to lookup details
            "confidence": confidence,
            "file_path": f"uploads/{relative_path}",
            "distance": distance_val
        }

    except ValueError as e:
        # --- IMPROVED ---: This 'except' block now handles "no face found" errors with specific messages.
        logger.warning(f"Face detection error: {str(e)}")
        # Check if the error message indicates no face was found.
        if "Face could not be detected" in str(e):
            raise HTTPException(status_code=400, detail="No face could be detected in the uploaded image. Please ensure the photo shows a clear, front-facing view of a person's face.")
        elif "Face could not be found" in str(e):
            raise HTTPException(status_code=400, detail="No face could be found in the uploaded image. Please use a clearer photo with better lighting.")
        else:
            # Handle other potential ValueErrors from the library.
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred during face analysis: {str(e)}")
    except Exception as e:
        # Generic fallback: return 500 with the original message
        logger.error(f"Unexpected error during face search: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during face analysis: {str(e)}")

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
            "needs_rebuild": should_rebuild_database()
        }
    except Exception as e:
        logger.error(f"Error getting database stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get database stats: {str(e)}")

# --- 10. Start the Uvicorn Server ---
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)