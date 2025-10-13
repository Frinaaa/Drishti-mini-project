"""
Drishti Face Recognition Module - SIMPLIFIED & EFFICIENT
=========================================================

Performs face matching against a pre-filtered, verified-only database index.
This version is faster and cleaner as it no longer needs to do post-search filtering.
"""

import os
import logging
from typing import Optional, Tuple
from deepface import DeepFace
import numpy as np
from .config import (
    MODEL_NAME,
    DETECTION_BACKENDS,
    ENHANCE_IMAGES,
    DB_PATH,
    UPLOADS_DIR,
)
from .image_processor import ImageProcessor
from .database_manager import DatabaseManager

logger = logging.getLogger(__name__)


class FaceRecognizer:
    """Handles face recognition against a pre-built, verified-only database."""

    def __init__(self, database_manager: DatabaseManager):
        self.db_manager = database_manager
        self.image_processor = ImageProcessor()

    def find_best_backend(self, image_path: str) -> str:
        """Finds the best detection backend for a given image file."""
        for backend in DETECTION_BACKENDS:
            try:
                DeepFace.verify(img1_path=image_path, img2_path=image_path, model_name=MODEL_NAME, detector_backend=backend, enforce_detection=True, silent=True)
                return backend
            except Exception:
                continue
        return 'opencv'

    def find_best_backend_in_memory(self, frame: np.ndarray) -> str:
        """Finds the best detection backend for an in-memory frame."""
        for backend in DETECTION_BACKENDS:
            try:
                DeepFace.verify(img1=frame, img2=frame, model_name=MODEL_NAME, detector_backend=backend, enforce_detection=True, silent=True)
                return backend
            except Exception:
                continue
        return "opencv"

    def _search_and_get_top_match(self, img_representation, db_path: str, backend: str) -> Tuple[Optional[str], Optional[float]]:
        """Core search function. Any match found is inherently verified."""
        try:
            results = DeepFace.find(
                img_path=img_representation,
                db_path=db_path,
                model_name=MODEL_NAME,
                detector_backend=backend,
                enforce_detection=False, # Already detected or will be
                silent=True
            )
            if results and len(results) > 0 and not results[0].empty:
                best_match = results[0].iloc[0]
                identity = best_match['identity']
                distance = best_match['distance']
                logger.info(f"SUCCESS: Found match '{os.path.basename(identity)}' with distance {distance:.4f}.")
                return identity, distance
        except Exception as e:
            # This can happen if no faces are detected in the input image.
            logger.info(f"DeepFace.find failed or found no matches. Reason: {e}")
        
        return None, None

    # =========================================================================
    # === PUBLIC API METHODS (Now much simpler)                           ===
    # =========================================================================

    def find_match_in_memory(self, frame: np.ndarray) -> Optional[dict]:
        """Public method for WebSocket handler. Searches for an in-memory frame."""
        pickle_file = self.db_manager.get_pickle_file_path()
        if not os.path.exists(pickle_file):
            return None # Cannot search if index doesn't exist

        backend = self.find_best_backend_in_memory(frame)
        identity, distance = self._search_and_get_top_match(frame, DB_PATH, backend)
        
        if not identity:
            return None

        confidence = 1 - float(distance)
        matched_filename = os.path.basename(identity)
        relative_path = os.path.relpath(identity, UPLOADS_DIR).replace("\\", "/")
        final_file_path = f"uploads/{relative_path}"

        return { "match_found": True, "filename": matched_filename, "confidence": confidence, "distance": distance, "file_path": final_file_path }

    async def process_face_match(self, temp_file_path: str, filename: str):
        """Main entry point for processing a single uploaded image file."""
        pickle_file = self.db_manager.get_pickle_file_path()
        if not os.path.exists(pickle_file):
             return {"match_found": False, "message": "Database is not built. No verified reports to search."}

        enhanced_path = None
        try:
            search_path = temp_file_path
            if ENHANCE_IMAGES:
                enhanced_path = self.image_processor.enhance_image(temp_file_path)
                search_path = enhanced_path

            backend = self.find_best_backend(search_path)
            identity, distance = self._search_and_get_top_match(search_path, DB_PATH, backend)
            
            if not identity:
                return {"match_found": False, "message": "No similar face found in the verified database."}
            
            confidence = 1 - float(distance)
            matched_filename = os.path.basename(identity)
            
            return {
                "match_found": True, "confidence": round(confidence, 3), "distance": round(distance, 4),
                "matched_image": matched_filename, "message": f"Match found with {confidence*100:.1f}% confidence."
            }
        except ValueError as e:
            msg = "No face detected in the uploaded image." if "face could not be detected" in str(e).lower() else f"Face analysis error: {e}"
            return {"match_found": False, "message": msg}
        except Exception as e:
            logger.error(f"Unexpected error in process_face_match: {e}")
            return {"match_found": False, "message": f"Processing error: {e}"}
        finally:
            if enhanced_path:
                self.image_processor.cleanup_temp_files(enhanced_path)