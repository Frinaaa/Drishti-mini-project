# ai_server/modules/face_recognition.py
"""
Drishti Face Recognition Module - HIGH-PERFORMANCE VERSION
===========================================================

This version provides a unified, highly efficient face-matching pipeline.
It eliminates redundant and slow operations, using Cosine Similarity for matching.
"""
from __future__ import annotations
import os
import logging
import pickle
from typing import Optional, Union, Dict, Any, List
from deepface import DeepFace
import numpy as np
from .config import (
    MODEL_NAME,
    DB_PATH,
    UPLOADS_DIR,
    ENHANCE_IMAGES,
    CONFIDENCE_THRESHOLD,
    LIVE_STREAM_CONFIDENCE_THRESHOLD,
)
from .image_processor import ImageProcessor
from .database_manager import DatabaseManager

logger = logging.getLogger(__name__)

DETECTOR_BACKEND = 'retinaface'

class FaceRecognizer:
    """Handles face recognition using a standardized, fast pipeline."""

    def __init__(self, database_manager: DatabaseManager):
        self.db_manager = database_manager
        self.image_processor = ImageProcessor()
        self.verified_faces_cache: List[List[Union[str, np.ndarray]]] = []

    def load_verified_faces_from_pickle(self):
        """
        Loads the pre-built database index from the .pkl file into memory.
        """
        pickle_file = self.db_manager.get_pickle_file_path()
        if not os.path.exists(pickle_file):
            logger.warning("Could not load verified faces to cache: database index file not found.")
            return

        try:
            with open(pickle_file, "rb") as f:
                self.verified_faces_cache = pickle.load(f)
            logger.info(f"✅CACHE LOADED: Successfully loaded {len(self.verified_faces_cache)} verified faces into in-memory cache.")
            if len(self.verified_faces_cache) == 0:
                logger.warning("⚠️ CACHE IS EMPTY! No verified reports found. Face matching will not find any results.")
        except Exception as e:
            logger.error(f"Failed to load verified faces from pickle file: {e}")

    def find_match_from_stream(self, frame_embedding: np.ndarray, threshold: float = LIVE_STREAM_CONFIDENCE_THRESHOLD) -> Optional[Dict[str, Any]]:
        """
        Ultra-fast, in-memory search using Cosine Similarity.
        """
        if not self.verified_faces_cache:
            return None 

        max_similarity = -1
        best_match_path = None
        
        frame_embedding_norm = frame_embedding / np.linalg.norm(frame_embedding)

        for path, cached_embedding in self.verified_faces_cache:
            cached_embedding_norm = np.array(cached_embedding) / np.linalg.norm(cached_embedding)
            similarity = np.dot(frame_embedding_norm, cached_embedding_norm)

            if similarity > max_similarity:
                max_similarity = similarity
                best_match_path = path

        # =================================================================
        # === NEW DETAILED LOGGING                                      ===
        # =================================================================
        # Always log the highest similarity score found, even if it's not a match.
        best_match_filename = os.path.basename(best_match_path) if best_match_path else "N/A"
        logger.info(
            f"STREAM ANALYSIS: Best similarity found was {max_similarity:.4f} "
            f"with '{best_match_filename}'. (Threshold is {threshold})"
        )
        # =================================================================

        if best_match_path and max_similarity >= threshold:
            distance = 1 - max_similarity 
            confidence = max_similarity
            matched_filename = os.path.basename(best_match_path)
            relative_path = os.path.relpath(best_match_path, UPLOADS_DIR).replace("\\", "/")
            final_file_path = f"uploads/{relative_path}"

            return {
                "match_found": True,
                "confidence": round(confidence, 3),
                "distance": round(distance, 4),
                "filename": matched_filename,
                "file_path": final_file_path,
                "message": f"Match found with {confidence*100:.1f}% confidence."
            }

        return None

    def find_match(self, img: Union[str, np.ndarray]) -> Optional[Dict[str, Any]]:
        # ... (This function remains unchanged)
        pickle_file = self.db_manager.get_pickle_file_path()
        if not os.path.exists(pickle_file):
            logger.warning("Database index not found. Cannot perform search.")
            return {"match_found": False, "message": "Database is not built. No verified reports to search."}

        try:
            results_df_list = DeepFace.find(
                img_path=img, db_path=DB_PATH, model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND, enforce_detection=True, silent=True
            )
            if results_df_list and not results_df_list[0].empty:
                best_match = results_df_list[0].iloc[0]
                distance = float(best_match['distance'])
                confidence = 1 - distance

                if confidence >= CONFIDENCE_THRESHOLD:
                    identity = best_match['identity']
                    matched_filename = os.path.basename(identity)
                    relative_path = os.path.relpath(identity, UPLOADS_DIR).replace("\\", "/")
                    final_file_path = f"uploads/{relative_path}"
                    logger.info(f"FILE MATCH: Found '{matched_filename}' with distance {distance:.4f}.")
                    return {
                        "match_found": True, "confidence": round(confidence, 3), "distance": round(distance, 4),
                        "matched_image": matched_filename, "filename": matched_filename,
                        "file_path": final_file_path, "message": f"Match found with {confidence*100:.1f}% confidence."
                    }
        except ValueError as e:
            if "face could not be detected" in str(e).lower():
                return {"match_found": False, "message": "No face detected in the provided image."}
            return {"match_found": False, "message": f"Face analysis error: {e}"}
        except Exception as e:
            logger.error(f"DeepFace.find failed unexpectedly: {e}")
            return {"match_found": False, "message": f"An unexpected error occurred during search: {e}"}

        return {"match_found": False, "message": "No similar face found in the verified database."}

    async def process_face_match(self, temp_file_path: str, filename: str):
        # ... (This function remains unchanged)
        enhanced_path = None
        try:
            search_path = temp_file_path
            if ENHANCE_IMAGES:
                enhanced_path = self.image_processor.enhance_image(temp_file_path)
                search_path = enhanced_path if enhanced_path else temp_file_path
            return self.find_match(search_path)
        except Exception as e:
            logger.error(f"Unexpected error in process_face_match wrapper: {e}")
            return {"match_found": False, "message": f"A critical processing error occurred: {e}"}
        finally:
            if enhanced_path:
                self.image_processor.cleanup_temp_files(enhanced_path)