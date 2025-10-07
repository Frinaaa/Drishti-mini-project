"""
Drishti Face Recognition Module
===============================

Face matching and recognition logic with optimized search algorithms.
"""

import os
import logging
from typing import Optional, Tuple
from deepface import DeepFace
import numpy as np  # <-- Make sure numpy is imported
from .config import MODEL_NAME, DETECTION_BACKENDS, ENHANCE_IMAGES, DB_PATH
from .image_processor import ImageProcessor
from .database_manager import DatabaseManager

logger = logging.getLogger(__name__)

class FaceRecognizer:
    """Handles face recognition and matching operations"""
    
    def __init__(self, database_manager: DatabaseManager):
        self.db_manager = database_manager
        self.image_processor = ImageProcessor()

    # =========================================================================
    # === START: NEW IN-MEMORY METHODS FOR LIVE VIDEO STREAM                ===
    # =========================================================================

    def find_match_in_memory(self, frame: np.ndarray) -> Optional[dict]:
        """
        Public method for the WebSocket handler. Processes an in-memory frame.
        This bypasses image enhancement for real-time performance.
        """
        try:
            # Step 1: Search for the face using our in-memory logic
            identity, distance = self.search_face_in_memory(frame, DB_PATH)

            if not identity:
                return None  # No match found

            # Step 2: Calculate confidence and prepare the result dictionary
            confidence = 1 - float(distance)
            matched_filename = os.path.basename(identity)
            
            return {
                'match_found': True,
                'filename': matched_filename,
                'confidence': confidence,
                'distance': distance
            }
        except ValueError as e:
            # This is often triggered by DeepFace if no face is in the frame
            if "face could not be detected" in str(e).lower():
                logger.warning("No face detected in the live stream frame.")
            else:
                logger.error(f"ValueError during in-memory search: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in find_match_in_memory: {e}")
            return None

    def search_face_in_memory(self, frame: np.ndarray, db_path: str) -> Tuple[Optional[str], Optional[float]]:
        """Optimized face search for an in-memory frame."""
        backend = self.find_best_backend_in_memory(frame)
        pickle_file = self.db_manager.get_pickle_file()

        if pickle_file:
            try:
                # DeepFace.find can accept a numpy array for img_path
                result = DeepFace.find(
                    img_path=frame, db_path=db_path,
                    model_name=MODEL_NAME, detector_backend=backend,
                    enforce_detection=False, silent=True
                )
                if result and len(result) > 0 and not result[0].empty:
                    best_match = result[0].iloc[0]
                    return best_match['identity'], best_match['distance']
            except Exception as e:
                logger.warning(f"In-memory DB search failed, falling back to manual: {str(e)[:100]}")
        
        return self.manual_search_in_memory(frame, db_path, backend)

    def find_best_backend_in_memory(self, frame: np.ndarray) -> str:
        """Find the best detection backend for an in-memory frame."""
        for backend in DETECTION_BACKENDS:
            try:
                # Pass the numpy array to both img1 and img2
                DeepFace.verify(
                    img1=frame, img2=frame, model_name=MODEL_NAME,
                    detector_backend=backend, enforce_detection=True, silent=True
                )
                return backend
            except Exception:
                continue
        return 'opencv'

    def manual_search_in_memory(self, frame: np.ndarray, db_path: str, backend: str) -> Tuple[Optional[str], Optional[float]]:
        """Manual face comparison search for an in-memory frame."""
        best_identity, best_distance = None, None
        model = self.db_manager.get_or_build_model()
        images = self.image_processor.get_image_files(db_path)
        
        for fname in images:
            candidate_path = os.path.join(db_path, fname)
            try:
                # Verify the in-memory frame against a candidate file path
                res = DeepFace.verify(
                    img1=frame, img2=candidate_path, model_name=MODEL_NAME,
                    model=model, detector_backend=backend,
                    enforce_detection=False, distance_metric="cosine"
                )
                distance = float(res.get("distance", 1.0))
                if best_distance is None or distance < best_distance:
                    best_distance = distance
                    best_identity = candidate_path
            except Exception:
                continue
        
        return best_identity, best_distance

    # =========================================================================
    # === END: NEW IN-MEMORY METHODS                                        ===
    # =========================================================================


    # V V V V V V V V V V V V V V V V V V V V V V V V V V V V V V V V V V V V V
    # --- ALL ORIGINAL FILE-BASED METHODS REMAIN UNCHANGED FOR HTTP API ---
    # V V V V V V V V V V V V V V V V V V V V V V V V V V V V V V V V V V V V V

    def find_best_backend(self, image_path: str) -> str:
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
    
    def search_face(self, query_path: str, db_path: str) -> Tuple[Optional[str], Optional[float]]:
        """Optimized face search with fallback mechanisms."""
        backend = self.find_best_backend(query_path)
        pickle_file = self.db_manager.get_pickle_file()
        
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
                    logger.info(f"Match found: {os.path.basename(identity)} (distance: {distance:.4f})")
                    return identity, distance
                    
            except Exception as e:
                logger.warning(f"Database search failed: {str(e)[:100]}")
        
        return self.manual_search(query_path, db_path, backend)
    
    def manual_search(self, query_path: str, db_path: str, backend: str) -> Tuple[Optional[str], Optional[float]]:
        """Manual face comparison search."""
        best_identity, best_distance = None, None
        model = self.db_manager.get_or_build_model()
        images = self.image_processor.get_image_files(db_path)
        
        logger.info(f"Manual search through {len(images)} images...")
        
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
                continue
        
        return best_identity, best_distance
    
    async def process_face_match(self, temp_file_path: str, filename: str):
        """Process face matching with enhanced detection."""
        enhanced_path = None
        
        try:
            if not self.db_manager.get_pickle_file() and self.image_processor.get_image_files(DB_PATH):
                await self.db_manager.update_database_async()
            
            search_path = temp_file_path
            if ENHANCE_IMAGES:
                enhanced_path = self.image_processor.enhance_image(temp_file_path)
                
                backend = self.find_best_backend(enhanced_path)
                if backend != 'opencv':
                    search_path = enhanced_path
                else:
                    self.image_processor.cleanup_temp_files(enhanced_path)
                    enhanced_path = None
            
            logger.info(f"Searching against {self.db_manager.state.image_count} images...")
            identity, distance = self.search_face(search_path, DB_PATH)
            
            if not identity:
                return {"match_found": False, "message": "No similar face found in database."}
            
            confidence = 1 - float(distance)
            matched_filename = os.path.basename(identity)
            
            logger.info(f"Match found: {matched_filename} (confidence: {confidence:.2f})")
            
            return {
                "match_found": True, "confidence": round(confidence, 3), "distance": round(distance, 4),
                "matched_image": matched_filename, "message": f"Match found with {confidence*100:.1f}% confidence"
            }
            
        except ValueError as e:
            error_msg = str(e).lower()
            if "face could not be detected" in error_msg:
                return {"match_found": False, "message": "No face detected. Please ensure clear lighting and face visibility."}
            return {"match_found": False, "message": f"Face analysis error: {str(e)}"}
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return {"match_found": False, "message": f"Processing error: {str(e)}"}
        finally:
            if enhanced_path:
                self.image_processor.cleanup_temp_files(enhanced_path)
    
    def process_frame_silent(self, frame, temp_path: str) -> Optional[dict]:
        """DEPRECATED: This file-based method is no longer suitable for websockets.
        Use find_match_in_memory instead."""
        # This method is now effectively replaced by find_match_in_memory
        logger.warning("process_frame_silent is deprecated for streams.")
        return None