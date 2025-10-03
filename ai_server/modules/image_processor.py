"""
Drishti Image Processing Module
===============================

Image enhancement and processing utilities for better face detection.
"""

import cv2
import os
import logging
from .config import MAX_IMAGE_SIZE

logger = logging.getLogger(__name__)

class ImageProcessor:
    """Handles all image processing operations"""
    
    @staticmethod
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
    
    @staticmethod
    def cleanup_temp_files(file_path: str):
        """Clean up temporary files."""
        try:
            if '_enhanced.jpg' in file_path and os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass
    
    @staticmethod
    def get_image_files(directory: str) -> list:
        """Get all image files in the directory"""
        if not os.path.exists(directory):
            return []
        return [f for f in os.listdir(directory) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    @staticmethod
    def initialize_face_detector():
        """Initialize OpenCV face detector for pre-filtering"""
        try:
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            face_cascade = cv2.CascadeClassifier(cascade_path)
            logger.info("OpenCV face detector initialized")
            return face_cascade
        except Exception as e:
            logger.warning(f"Could not initialize face detector: {e}")
            return None
    
    @staticmethod
    def has_face(frame, face_cascade, min_face_size: int = 80) -> bool:
        """Quick face detection using OpenCV to filter frames"""
        if face_cascade is None:
            return True  # If no detector, assume there might be a face
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, 
            minSize=(min_face_size, min_face_size)
        )
        return len(faces) > 0
    
    @staticmethod
    def draw_face_rectangles(frame, face_cascade, min_face_size: int = 80):
        """Draw rectangles around detected faces"""
        if face_cascade is None:
            return frame
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, 
            minSize=(min_face_size, min_face_size)
        )
        
        for (x, y, w, h) in faces:
            cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)
            cv2.putText(frame, "Face Detected", (x, y-10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)
        
        return frame
