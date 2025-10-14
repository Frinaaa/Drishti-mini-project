"""
Drishti Database Manager Module - HIGH-EFFICIENCY VERSION
=========================================================

Builds the face recognition database index using ONLY images from verified reports.
This prevents unverified/rejected faces from ever entering the search index,
dramatically improving speed and accuracy.
"""

import os
import time
import logging
import asyncio
import pickle
import requests
from typing import Optional, Dict
from deepface import DeepFace
from .config import DB_PATH, MODEL_NAME, BACKEND_API_URL
from .image_processor import ImageProcessor

logger = logging.getLogger(__name__)


class DatabaseState:
    """Manages the face recognition database state."""
    def __init__(self):
        self.last_build_time: Optional[float] = None
        self.image_count: int = 0
        self.is_building: bool = False
        self.model = None
        self.build_duration: Optional[float] = None
        self.error_count: int = 0


class DatabaseManager:
    """Builds and manages a face database index from verified reports only."""

    def __init__(self):
        self.state = DatabaseState()
        self.image_processor = ImageProcessor()
        self._model_cache = None
        self.verified_filenames_cache = []

    def get_pickle_file_path(self) -> str:
        """Returns the full path for the representations pickle file."""
        return os.path.join(DB_PATH, f"representations_{MODEL_NAME.lower().replace('-', '_')}.pkl")

    def get_verified_filenames(self) -> list:
        """Fetches the list of filenames for verified reports from the backend."""
        try:
            url = f"{BACKEND_API_URL}/api/reports/verified-filenames"
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            filenames = response.json()
            logger.info(f"Successfully fetched {len(filenames)} verified filenames from backend.")
            self.verified_filenames_cache = filenames
            return filenames
        except requests.exceptions.RequestException as e:
            logger.error(f"Could not fetch verified filenames, using last known cache: {e}")
            return self.verified_filenames_cache

    def should_rebuild_database(self) -> bool:
        """
        Checks if the database needs to be rebuilt by comparing the current list
        of verified images with the number of images in the last build.
        """
        latest_verified_files = self.get_verified_filenames()
        
        pickle_file = self.get_pickle_file_path()
        if not os.path.exists(pickle_file):
            logger.info("No database index (.pkl) file found. Rebuild is required.")
            return True
        
        # If the number of verified files has changed, a rebuild is needed.
        if len(latest_verified_files) != self.state.image_count:
            logger.info(f"Change in verified images detected ({self.state.image_count} -> {len(latest_verified_files)}). Rebuild is required.")
            return True
        
        return False

    def get_or_build_model(self):
        """Gets the cached DeepFace model or builds it if not available."""
        if self._model_cache is None:
            logger.info(f"Building {MODEL_NAME} model for embedding generation...")
            try:
                self._model_cache = DeepFace.build_model(MODEL_NAME)
                logger.info("Model built and cached successfully.")
            except Exception as e:
                logger.error(f"Failed to build DeepFace model: {e}")
                raise
        return self._model_cache

    async def update_database_async(self):
        """Asynchronously triggers a full rebuild of the verified-only database."""
        if self.state.is_building:
            logger.info("Database update already in progress, skipping.")
            return

        self.state.is_building = True
        start_time = time.time()
        
        try:
            logger.info("Starting verified-only database rebuild...")
            loop = asyncio.get_running_loop()
            # Run the synchronous, blocking build process in a separate thread
            await loop.run_in_executor(None, self._build_verified_database_sync)
            
            self.state.last_build_time = time.time()
            self.state.build_duration = self.state.last_build_time - start_time
            logger.info(f"Database rebuild completed in {self.state.build_duration:.2f}s. Index now contains {self.state.image_count} verified images.")
        
        except Exception as e:
            logger.error(f"Database update failed catastrophically: {e}")
            self.state.error_count += 1
        finally:
            self.state.is_building = False

    def _build_verified_database_sync(self):
        """
        Synchronous method that constructs the database index (.pkl file)
        manually, using only images from verified reports.
        """
        verified_filenames = self.get_verified_filenames()
        pickle_file_path = self.get_pickle_file_path()

        # Delete the old index file before building a new one
        if os.path.exists(pickle_file_path):
            os.remove(pickle_file_path)
            logger.info(f"Removed old database index file.")

        if not verified_filenames:
            logger.warning("No verified images found. The database index will be empty.")
            self.state.image_count = 0
            return

        representations = []
        skipped_count = 0
        model = self.get_or_build_model() # Ensure model is ready

        logger.info(f"Generating representations for {len(verified_filenames)} verified images...")
        
        for filename in verified_filenames:
            # Try both with and without .jpg extension
            image_path = os.path.join(DB_PATH, filename)
            if not os.path.exists(image_path):
                image_path_with_ext = os.path.join(DB_PATH, filename + '.jpg')
                if os.path.exists(image_path_with_ext):
                    image_path = image_path_with_ext
                else:
                    logger.warning(f"Skipping '{filename}' as it does not exist in the filesystem.")
                    skipped_count += 1
                    continue
            
            try:
                # This is the core operation: create a vector embedding for the face
                embedding = DeepFace.represent(
                    img_path=image_path,
                    model_name=MODEL_NAME,
                    enforce_detection=True,
                    detector_backend='retinaface'
                )
                # DeepFace returns a list of dicts, we need the first embedding
                if embedding and len(embedding) > 0:
                    representation = embedding[0]["embedding"]
                    # The pickle file format is a list of [path, embedding]
                    representations.append([image_path, representation])
                else:
                    raise ValueError("No embedding generated.")

            except Exception as e:
                logger.warning(f"Could not process '{filename}': Face not detected or error. Skipping. Reason: {e}")
                skipped_count += 1
        
        if representations:
            with open(pickle_file_path, "wb") as f:
                pickle.dump(representations, f)
            logger.info(f"Successfully created new database index with {len(representations)} entries.")
        
        self.state.image_count = len(representations)

    def get_database_stats(self) -> Dict[str, any]:
        """Gets comprehensive database statistics."""
        # This function can be simplified as it's less critical now
        return {
            "is_building": self.state.is_building,
            "last_build_time": self.state.last_build_time,
            "build_duration": self.state.build_duration,
            "indexed_verified_images": self.state.image_count,
            "error_count": self.state.error_count,
            "db_path": DB_PATH,
            "model_name": MODEL_NAME
        }