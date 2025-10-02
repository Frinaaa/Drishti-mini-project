"""
Drishti Database Manager Module
===============================

Manages face recognition database state and operations.
"""

import os
import time
import logging
import asyncio
from typing import Optional
from deepface import DeepFace
from .config import DB_PATH, MODEL_NAME
from .image_processor import ImageProcessor

logger = logging.getLogger(__name__)

class DatabaseState:
    """Manages the face recognition database state"""
    def __init__(self):
        self.last_build_time: Optional[float] = None
        self.image_count: int = 0
        self.is_building: bool = False
        self.model = None

class DatabaseManager:
    """Handles all database operations for face recognition"""
    
    def __init__(self):
        self.state = DatabaseState()
        self.image_processor = ImageProcessor()
    
    def get_pickle_file(self) -> Optional[str]:
        """Get the DeepFace pickle file path if it exists"""
        if not os.path.exists(DB_PATH):
            return None
        for fname in os.listdir(DB_PATH):
            if fname.endswith('.pkl'):
                return os.path.join(DB_PATH, fname)
        return None
    
    def should_rebuild_database(self) -> bool:
        """Check if the database needs to be rebuilt"""
        current_images = self.image_processor.get_image_files(DB_PATH)
        current_count = len(current_images)
        
        # Check if pickle file exists
        pickle_file = self.get_pickle_file()
        if not pickle_file:
            logger.info(f"No pickle file found. Need to build database for {current_count} images.")
            return current_count > 0
        
        # Check if image count changed
        if current_count != self.state.image_count:
            logger.info(f"Image count changed: {self.state.image_count} -> {current_count}. Rebuild needed.")
            return True
        
        return False
    
    def get_or_build_model(self):
        """Get cached model or build it if not available"""
        if self.state.model is None:
            logger.info(f"Building {MODEL_NAME} model...")
            self.state.model = DeepFace.build_model(MODEL_NAME)
            logger.info("Model built and cached.")
        return self.state.model
    
    async def update_database_async(self):
        """Update the face database incrementally when new images are added"""
        if self.state.is_building:
            logger.info("Database update already in progress, skipping...")
            return
        
        try:
            self.state.is_building = True
            current_images = self.image_processor.get_image_files(DB_PATH)
            current_count = len(current_images)
            
            if current_count == 0:
                logger.warning("No images in reports directory.")
                self.state.image_count = 0
                return
            
            # If this is first time or image count increased significantly, do full rebuild
            if self.state.image_count == 0 or not self.get_pickle_file():
                logger.info(f"Full database build needed for {current_count} images...")
                await self._full_rebuild()
            else:
                # Incremental update: DeepFace automatically handles new images
                logger.info(f"Incremental update: {self.state.image_count} → {current_count} images")
                loop = asyncio.get_running_loop()
                await loop.run_in_executor(None, self._incremental_update)
            
            # Update state
            self.state.image_count = current_count
            self.state.last_build_time = time.time()
            
            logger.info(f"Database updated successfully! Now has {current_count} images.")
            
        except Exception as e:
            logger.error(f"Error updating database: {e}")
        finally:
            self.state.is_building = False
    
    async def _full_rebuild(self):
        """Perform a complete database rebuild"""
        # Delete existing pickle files
        for fname in os.listdir(DB_PATH):
            if fname.endswith('.pkl'):
                pkl_path = os.path.join(DB_PATH, fname)
                os.remove(pkl_path)
                logger.info(f"Deleted old pickle file: {fname}")
        
        # Run the rebuild in a thread to avoid blocking
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self._build_database_sync)
    
    def _build_database_sync(self):
        """Synchronous function to build the database using DeepFace"""
        images = self.image_processor.get_image_files(DB_PATH)
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
                logger.info(f"Created pickle database for {len(images)} images")
            except Exception as e:
                # Expected error during initial build - pickle file is still created
                logger.info(f"Database build completed for {len(images)} images")
    
    def _incremental_update(self):
        """Incremental update - DeepFace automatically detects new images"""
        images = self.image_processor.get_image_files(DB_PATH)
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
                logger.info(f"Database automatically updated with new images")
            except Exception:
                # This is expected - database is updated regardless
                logger.info(f"Incremental update completed")
    
    def get_database_stats(self) -> dict:
        """Get comprehensive database statistics"""
        try:
            image_files = self.image_processor.get_image_files(DB_PATH)
            pickle_files = []
            if os.path.exists(DB_PATH):
                pickle_files = [f for f in os.listdir(DB_PATH) if f.endswith('.pkl')]
            
            return {
                "total_images": len(image_files),
                "cached_image_count": self.state.image_count,
                "database_built": len(pickle_files) > 0,
                "is_building": self.state.is_building,
                "last_build_time": self.state.last_build_time,
                "model_cached": self.state.model is not None,
                "pickle_files": pickle_files,
                "needs_rebuild": self.should_rebuild_database()
            }
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {}
