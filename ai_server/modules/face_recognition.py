"""
Drishti Face Recognition Module
===============================

Face matching and recognition logic with optimized search algorithms.
"""

import os
import logging
from typing import Optional, Tuple
from deepface import DeepFace
from .config import MODEL_NAME, DETECTION_BACKENDS, ENHANCE_IMAGES, DB_PATH
from .image_processor import ImageProcessor
from .database_manager import DatabaseManager

logger = logging.getLogger(__name__)

class FaceRecognizer:
    """Handles face recognition and matching operations"""
    
    def __init__(self, database_manager: DatabaseManager):
        self.db_manager = database_manager
        self.image_processor = ImageProcessor()
    
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
                    logger.info(f"Match found: {os.path.basename(identity)} (distance: {distance:.4f})")
                    return identity, distance
                    
            except Exception as e:
                logger.warning(f"Database search failed: {str(e)[:100]}")
        
        # Fallback to manual search
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
                continue  # Skip problematic images
        
        return best_identity, best_distance
    
    async def process_face_match(self, temp_file_path: str, filename: str):
        """Process face matching with enhanced detection."""
        enhanced_path = None
        
        try:
            # Ensure database is ready
            if not self.db_manager.get_pickle_file() and self.image_processor.get_image_files(DB_PATH):
                await self.db_manager.update_database_async()
            
            # Enhance image if enabled
            search_path = temp_file_path
            if ENHANCE_IMAGES:
                enhanced_path = self.image_processor.enhance_image(temp_file_path)
                
                # Use enhanced version if face detection works
                backend = self.find_best_backend(enhanced_path)
                if backend != 'opencv':  # If enhanced version works better
                    search_path = enhanced_path
                else:
                    self.image_processor.cleanup_temp_files(enhanced_path)
                    enhanced_path = None
            
            # Search for matches
            logger.info(f"Searching against {self.db_manager.state.image_count} images...")
            identity, distance = self.search_face(search_path, DB_PATH)
            
            if not identity:
                return {
                    "match_found": False,
                    "message": "No similar face found in database."
                }
            
            confidence = 1 - float(distance)
            matched_filename = os.path.basename(identity)
            
            logger.info(f"Match found: {matched_filename} (confidence: {confidence:.2f})")
            
            return {
                "match_found": True,
                "confidence": round(confidence, 3),
                "distance": round(distance, 4),
                "matched_image": matched_filename,
                "message": f"Match found with {confidence*100:.1f}% confidence"
            }
            
        except ValueError as e:
            error_msg = str(e).lower()
            if "face could not be detected" in error_msg:
                return {
                    "match_found": False,
                    "message": "No face detected. Please ensure clear lighting and face visibility."
                }
            return {
                "match_found": False,
                "message": f"Face analysis error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return {
                "match_found": False,
                "message": f"Processing error: {str(e)}"
            }
        finally:
            if enhanced_path:
                self.image_processor.cleanup_temp_files(enhanced_path)
    
    def process_frame_silent(self, frame, temp_path: str) -> Optional[dict]:
        """Process a single frame for face matching and return results (no logging)"""
        enhanced_path = None
        try:
            # Enhance image if enabled
            search_path = temp_path
            if ENHANCE_IMAGES:
                enhanced_path = self.image_processor.enhance_image(temp_path)
                
                # Use enhanced version if face detection works
                backend = self.find_best_backend(enhanced_path)
                if backend != 'opencv':  # If enhanced version works better
                    search_path = enhanced_path
                else:
                    self.image_processor.cleanup_temp_files(enhanced_path)
                    enhanced_path = None
            
            identity, distance = self.search_face(search_path, DB_PATH)
            
            # Clean up enhanced file
            if enhanced_path:
                self.image_processor.cleanup_temp_files(enhanced_path)
            
            if not identity:
                return None
            
            confidence = 1 - float(distance)
            
            # Return match result
            matched_filename = os.path.basename(identity)
            return {
                'filename': matched_filename,
                'confidence': confidence,
                'distance': distance
            }
                
        except Exception as e:
            # Clean up enhanced file on error
            if enhanced_path:
                self.image_processor.cleanup_temp_files(enhanced_path)
            return None
