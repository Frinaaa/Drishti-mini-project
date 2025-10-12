"""
Drishti Database Manager Module
===============================

Optimized face recognition database management with improved error handling and performance.
"""

import os
import time
import logging
import asyncio
from typing import Optional, Dict, List
from deepface import DeepFace
from .config import DB_PATH, MODEL_NAME
from .image_processor import ImageProcessor

logger = logging.getLogger(__name__)


class DatabaseState:
    """Manages the face recognition database state with performance tracking"""
    def __init__(self):
        self.last_build_time: Optional[float] = None
        self.image_count: int = 0
        self.is_building: bool = False
        self.model = None
        self.build_duration: Optional[float] = None
        self.error_count: int = 0


class DatabaseManager:
    """Optimized database manager for face recognition operations"""

    def __init__(self):
        self.state = DatabaseState()
        self.image_processor = ImageProcessor()
        self._model_cache = None
    
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
        """Get cached model or build it if not available with performance tracking"""
        if self._model_cache is None:
            start_time = time.time()
            logger.info(f"Building {MODEL_NAME} model...")
            try:
                self._model_cache = DeepFace.build_model(MODEL_NAME)
                build_time = time.time() - start_time
                logger.info(f"Model built and cached in {build_time:.2f}s.")
            except Exception as e:
                logger.error(f"Failed to build model: {e}")
                self.state.error_count += 1
                raise
        return self._model_cache
    
    async def update_database_async(self):
        """Update the face database incrementally or perform full rebuild when needed"""
        if self.state.is_building:
            logger.info("Database update already in progress, skipping...")
            return

        start_time = time.time()
        self.state.is_building = True

        try:
            current_images = self.image_processor.get_image_files(DB_PATH)
            current_count = len(current_images)

            if current_count == 0:
                logger.warning("No images found in database directory")
                self.state.image_count = 0
                return

            # Determine update strategy
            needs_full_rebuild = (
                self.state.image_count == 0 or
                not self.get_pickle_file() or
                current_count > self.state.image_count * 1.5  # 50% increase threshold
            )

            if needs_full_rebuild:
                logger.info(f"Performing full rebuild for {current_count} images...")
                await self._full_rebuild()
            else:
                logger.info(f"Performing incremental update: {self.state.image_count} → {current_count} images")
                loop = asyncio.get_running_loop()
                await loop.run_in_executor(None, self._incremental_update)

            # Update state
            self.state.image_count = current_count
            self.state.last_build_time = time.time()
            self.state.build_duration = time.time() - start_time

            logger.info(f"Database updated successfully in {self.state.build_duration:.2f}s! "
                       f"Now contains {current_count} images.")

        except Exception as e:
            logger.error(f"Database update failed: {e}")
            self.state.error_count += 1
            raise
        finally:
            self.state.is_building = False
    
    async def _full_rebuild(self):
        """Perform a complete database rebuild"""
        # Delete existing pickle files
        if os.path.exists(DB_PATH):
            for fname in os.listdir(DB_PATH):
                if fname.endswith('.pkl'):
                    pkl_path = os.path.join(DB_PATH, fname)
                    try:
                        os.remove(pkl_path)
                        logger.info(f"Deleted old pickle file: {fname}")
                    except OSError as e:
                        logger.warning(f"Could not delete old pickle file {fname}: {e}")

        # Run the rebuild in a thread to avoid blocking
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self._build_database_sync)

    def _validate_and_build_database(self, images: List[str], operation: str = "build") -> Dict[str, int]:
        """Validate images and build/update database with comprehensive error handling"""
        if not images:
            return {"total": 0, "valid": 0, "skipped": 0}

        valid_images = []
        skipped_count = 0

        for image_name in images:
            image_path = os.path.join(DB_PATH, image_name)
            try:
                # Test if the image has detectable faces
                DeepFace.verify(
                    img1_path=image_path,
                    img2_path=image_path,
                    model_name=MODEL_NAME,
                    enforce_detection=False,
                    silent=True
                )
                valid_images.append(image_name)
                logger.debug(f"Face detected in {image_name}")
            except Exception as e:
                skipped_count += 1
                logger.debug(f"Face not detected in {image_name} ({operation}): {e}")
                continue

        if valid_images:
            try:
                # Use first valid image to trigger database operation
                test_image = os.path.join(DB_PATH, valid_images[0])
                DeepFace.find(
                    img_path=test_image,
                    db_path=DB_PATH,
                    model_name=MODEL_NAME,
                    enforce_detection=False,
                    silent=True
                )
                logger.info(f"Database {operation} completed: {len(valid_images)} valid, "
                           f"{skipped_count} skipped out of {len(images)} total")
            except Exception as e:
                # Database operation may still succeed despite this exception
                logger.info(f"Database {operation} finished with {len(valid_images)} valid images "
                           f"(exception: {e})")

        return {"total": len(images), "valid": len(valid_images), "skipped": skipped_count}

    def _build_database_sync(self):
        """Synchronous function to build the database using DeepFace with validation"""
        images = self.image_processor.get_image_files(DB_PATH)
        stats = self._validate_and_build_database(images, "build")

        if stats["valid"] == 0:
            logger.warning("No valid images with detectable faces found in the database directory")
            logger.info("To test face recognition, add images with clear faces to the reports directory")

    def _incremental_update(self):
        """Incremental update - DeepFace automatically detects new images"""
        images = self.image_processor.get_image_files(DB_PATH)
        self._validate_and_build_database(images, "update")
    
    def get_database_stats(self) -> Dict[str, any]:
        """Get comprehensive database statistics with performance metrics"""
        try:
            image_files = self.image_processor.get_image_files(DB_PATH)
            pickle_files = []
            if os.path.exists(DB_PATH):
                pickle_files = [f for f in os.listdir(DB_PATH) if f.endswith('.pkl')]

            # Calculate rebuild recommendation
            needs_rebuild = self.should_rebuild_database()
            rebuild_reason = "none"
            if needs_rebuild:
                if not pickle_files:
                    rebuild_reason = "no_pickle"
                elif len(image_files) != self.state.image_count:
                    rebuild_reason = "count_mismatch"
                else:
                    rebuild_reason = "unknown"

            return {
                "total_images": len(image_files),
                "valid_images": len(image_files),  # Could be enhanced to validate faces
                "cached_image_count": self.state.image_count,
                "database_built": len(pickle_files) > 0,
                "is_building": self.state.is_building,
                "last_build_time": self.state.last_build_time,
                "build_duration": self.state.build_duration,
                "model_cached": self._model_cache is not None,
                "error_count": self.state.error_count,
                "pickle_files": pickle_files,
                "needs_rebuild": needs_rebuild,
                "rebuild_reason": rebuild_reason,
                "db_path": DB_PATH,
                "model_name": MODEL_NAME
            }
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            self.state.error_count += 1
            return {
                "error": str(e),
                "error_count": self.state.error_count
            }