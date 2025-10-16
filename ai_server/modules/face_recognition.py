"""
Drishti Face Recognition Module - HIGH-PERFORMANCE VERSION
===========================================================

This version provides a unified, highly efficient face-matching pipeline.
It eliminates redundant and slow operations like 'find_best_backend',
resulting in near-instantaneous search results for both file uploads and live streams.
"""

import os
import logging
from typing import Optional, Union, Dict, Any
from deepface import DeepFace
import numpy as np
from .config import (
    MODEL_NAME,
    DB_PATH,
    UPLOADS_DIR,
    ENHANCE_IMAGES
)
from .image_processor import ImageProcessor
from .database_manager import DatabaseManager

logger = logging.getLogger(__name__)

# --- Use a single, reliable backend for consistency and speed ---
DETECTOR_BACKEND = 'retinaface'


class FaceRecognizer:
    """Handles face recognition using a standardized, fast pipeline."""

    def __init__(self, database_manager: DatabaseManager):
        self.db_manager = database_manager
        self.image_processor = ImageProcessor()

    def find_match(self, img: Union[str, np.ndarray]) -> Optional[Dict[str, Any]]:
        """
        Core high-performance search function for both files and in-memory frames.
        This is the new heart of the recognition module.
        """
        pickle_file = self.db_manager.get_pickle_file_path()
        if not os.path.exists(pickle_file):
            logger.warning("Database index not found. Cannot perform search.")
            return {"match_found": False, "message": "Database is not built. No verified reports to search."}

        try:
            # DeepFace.find is extremely fast when a .pkl file exists.
            # It only needs to detect the face in the input 'img' and then does a vector search.
            results_df_list = DeepFace.find(
                img_path=img,
                db_path=DB_PATH,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=True, # Critical: Ensures a face is found in the input
                silent=True
            )

            # Check if any results were returned and if the first result DataFrame is not empty
            if results_df_list and not results_df_list[0].empty:
                best_match = results_df_list[0].iloc[0]
                identity = best_match['identity']
                distance = float(best_match['distance'])
                confidence = 1 - distance
                
                matched_filename = os.path.basename(identity)
                relative_path = os.path.relpath(identity, UPLOADS_DIR).replace("\\", "/")
                final_file_path = f"uploads/{relative_path}"

                logger.info(f"SUCCESS: Found match '{matched_filename}' with distance {distance:.4f}.")
                
                return {
                    "match_found": True,
                    "confidence": round(confidence, 3),
                    "distance": round(distance, 4),
                    "matched_image": matched_filename, # Legacy for single upload
                    "filename": matched_filename,      # For WebSocket consistency
                    "file_path": final_file_path,
                    "message": f"Match found with {confidence*100:.1f}% confidence."
                }

        except ValueError as e:
            # This is commonly triggered if no face is detected in the input image.
            if "face could not be detected" in str(e).lower():
                logger.info("No face detected in the input image.")
                return {"match_found": False, "message": "No face detected in the provided image."}
            else:
                logger.warning(f"Face analysis error during find_match: {e}")
                return {"match_found": False, "message": f"Face analysis error: {e}"}
        except Exception as e:
            logger.error(f"DeepFace.find failed unexpectedly: {e}")
            return {"match_found": False, "message": f"An unexpected error occurred during search: {e}"}

        # If we reach here, no match was found
        return {"match_found": False, "message": "No similar face found in the verified database."}

    # =========================================================================
    # === PUBLIC API METHODS (Now simplified wrappers around find_match)    ===
    # =========================================================================

    def find_match_in_memory(self, frame: np.ndarray) -> Optional[dict]:
        """Public method for WebSocket handler. Searches for an in-memory frame."""
        return self.find_match(frame)

    async def process_face_match(self, temp_file_path: str, filename: str):
        """Main entry point for processing a single uploaded image file."""
        enhanced_path = None
        try:
            search_path = temp_file_path
            if ENHANCE_IMAGES:
                # Image enhancement can still be useful for poor quality images
                enhanced_path = self.image_processor.enhance_image(temp_file_path)
                search_path = enhanced_path if enhanced_path else temp_file_path

            # The magic happens here: call the new, fast, unified function
            return self.find_match(search_path)
            
        except Exception as e:
            logger.error(f"Unexpected error in process_face_match wrapper: {e}")
            return {"match_found": False, "message": f"A critical processing error occurred: {e}"}
        finally:
            if enhanced_path:
                self.image_processor.cleanup_temp_files(enhanced_path)