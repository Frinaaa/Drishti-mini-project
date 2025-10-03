"""
Drishti Live Video Module
==========================

Live video matching functionality for real-time face recognition.
"""

import cv2
import os
import time
import base64
import threading
import numpy as np
from datetime import datetime
from typing import Optional, Dict, Any, List
from collections import deque
import logging

from .config import (
    FRAME_SKIP, MIN_FACE_SIZE, MATCH_COOLDOWN, MAX_RECENT_MATCHES,
    CONFIDENCE_THRESHOLD, CAPTURE_DIR
)
from .image_processor import ImageProcessor
from .face_recognition import FaceRecognizer
from .database_manager import DatabaseManager

logger = logging.getLogger(__name__)

class LiveVideoMatcher:
    """Handles live video face matching operations"""
    
    def __init__(self, face_recognizer: FaceRecognizer):
        self.face_recognizer = face_recognizer
        self.image_processor = ImageProcessor()
        
        # Video capture
        self.camera = None
        self.face_cascade = None
        
        # Processing state
        self.frame_count = 0
        self.last_match_time = 0
        self.recent_matches = deque(maxlen=MAX_RECENT_MATCHES)
        self.processing = False
        self.current_result = None
        self.result_lock = threading.Lock()
        self.running = True
        
        # Performance tracking
        self.total_frames = 0
        self.processed_frames = 0
        self.start_time = time.time()
        
        # Initialize face detector
        self.face_cascade = self.image_processor.initialize_face_detector()
    
    def initialize_camera(self) -> bool:
        """Initialize the webcam"""
        logger.info("Initializing camera for live video...")
        self.camera = cv2.VideoCapture(0)
        
        if not self.camera.isOpened():
            logger.error("Could not open webcam")
            return False
        
        # Set camera properties
        self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        self.camera.set(cv2.CAP_PROP_FPS, 30)
        
        logger.info("Camera initialized successfully")
        return True
    
    def frame_to_base64(self, frame: np.ndarray) -> str:
        """Convert frame to base64 format"""
        _, buffer = cv2.imencode('.jpg', frame)
        encoded_string = base64.b64encode(buffer).decode()
        return f"data:image/jpeg;base64,{encoded_string}"
    
    def process_frame_async(self, frame: np.ndarray):
        """Process frame for face matching in a separate thread"""
        if self.processing:
            return  # Skip if already processing
        
        def process():
            self.processing = True
            try:
                # Save temporary frame
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
                temp_filename = f"live_frame_{timestamp}.jpg"
                temp_path = os.path.join(CAPTURE_DIR, temp_filename)
                cv2.imwrite(temp_path, frame)
                
                # Process with face recognizer
                result = self.face_recognizer.process_frame_silent(frame, temp_path)
                
                # Clean up temp file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                
                with self.result_lock:
                    if result and result['confidence'] >= CONFIDENCE_THRESHOLD:
                        self.current_result = {
                            "match_found": True,
                            "matched_image": result['filename'],
                            "confidence": result['confidence']
                        }
                        self.last_match_time = time.time()
                        
                        # Store match
                        match_info = {
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                            "image": result['filename'],
                            "confidence": result['confidence'] * 100
                        }
                        self.recent_matches.append(match_info)
                        logger.info(f"Match: {match_info['image']} ({match_info['confidence']:.1f}%)")
                    else:
                        self.current_result = {"match_found": False}
                        self.last_match_time = time.time()
                
                self.processed_frames += 1
                
            except Exception as e:
                logger.error(f"Processing error: {e}")
            finally:
                self.processing = False
        
        # Run in background thread
        threading.Thread(target=process, daemon=True).start()
    
    def draw_overlay(self, frame: np.ndarray) -> np.ndarray:
        """Draw information overlay on the frame"""
        height, width = frame.shape[:2]
        overlay = frame.copy()
        
        # Title
        cv2.putText(overlay, "DRISHTI LIVE FACE MATCHING", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        
        # Stats panel
        stats_y = 70
        cv2.putText(overlay, f"FPS: {self.get_fps():.1f}", (10, stats_y), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        cv2.putText(overlay, f"Processed: {self.processed_frames}/{self.total_frames}", 
                   (10, stats_y + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        cv2.putText(overlay, f"Processing: {'Yes' if self.processing else 'No'}", 
                   (10, stats_y + 50), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        # Current match result
        with self.result_lock:
            if self.current_result and time.time() - self.last_match_time < 5:
                result_y = height - 150
                
                if self.current_result.get("match_found"):
                    confidence = self.current_result.get("confidence", 0) * 100
                    matched_image = self.current_result.get("matched_image", "Unknown")
                    
                    # Match found
                    color = (0, 255, 0) if confidence >= CONFIDENCE_THRESHOLD * 100 else (0, 255, 255)
                    cv2.putText(overlay, "MATCH FOUND!", (10, result_y), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
                    cv2.putText(overlay, f"Image: {matched_image}", (10, result_y + 30), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                    cv2.putText(overlay, f"Confidence: {confidence:.1f}%", (10, result_y + 55), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                else:
                    # No match
                    cv2.putText(overlay, "NO MATCH", (10, result_y), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        
        # Recent matches panel
        if self.recent_matches:
            matches_y = height - 300
            cv2.putText(overlay, "Recent Matches:", (width - 300, matches_y), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            for i, match in enumerate(list(self.recent_matches)[-5:]):  # Show last 5
                text = f"{match['timestamp']}: {os.path.basename(match['image'])} ({match['confidence']:.1f}%)"
                cv2.putText(overlay, text, (width - 300, matches_y + 25 + i*20), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        
        # Controls
        controls_y = height - 30
        cv2.putText(overlay, "Press 'q' to quit, SPACE to force process frame", 
                   (10, controls_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        return overlay
    
    def get_fps(self) -> float:
        """Calculate current FPS"""
        elapsed = time.time() - self.start_time
        return self.total_frames / elapsed if elapsed > 0 else 0
    
    def save_current_frame(self, frame: np.ndarray):
        """Save current frame to capture directory"""
        os.makedirs(CAPTURE_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"live_capture_{timestamp}.jpg"
        filepath = os.path.join(CAPTURE_DIR, filename)
        
        if cv2.imwrite(filepath, frame):
            logger.info(f"Frame saved: {filename}")
        else:
            logger.error("Failed to save frame")
    
    def run_live_matching(self) -> bool:
        """Run the live video face matching"""
        logger.info("Starting Live Video Face Matching")
        logger.info("Controls: SPACE=Force process, S=Save frame, Q=Quit")
        
        # Initialize camera
        if not self.initialize_camera():
            return False
        
        try:
            while self.running:
                ret, frame = self.camera.read()
                if not ret:
                    logger.error("Failed to read frame")
                    break
                
                self.total_frames += 1
                
                # Draw face detection boxes
                frame = self.image_processor.draw_face_rectangles(frame, self.face_cascade, MIN_FACE_SIZE)
                
                # Process frame for matching (every FRAME_SKIP frames)
                should_process = (
                    self.frame_count % FRAME_SKIP == 0 and 
                    self.image_processor.has_face(frame, self.face_cascade, MIN_FACE_SIZE) and
                    not self.processing and
                    time.time() - self.last_match_time > MATCH_COOLDOWN
                )
                
                if should_process:
                    self.process_frame_async(frame)
                
                # Draw overlay with information
                display_frame = self.draw_overlay(frame)
                
                # Display the frame
                cv2.imshow('Drishti Live Face Matching - Press Q to quit', display_frame)
                
                # Handle key presses
                key = cv2.waitKey(1) & 0xFF
                
                if key == ord('q'):
                    logger.info("Exiting live matching...")
                    self.running = False
                    break
                elif key == ord(' '):
                    # Force process current frame
                    if not self.processing and self.image_processor.has_face(frame, self.face_cascade, MIN_FACE_SIZE):
                        logger.info("Force processing frame...")
                        self.process_frame_async(frame)
                elif key == ord('s'):
                    # Save current frame
                    self.save_current_frame(frame)
                
                self.frame_count += 1
                
        except KeyboardInterrupt:
            logger.info("Live matching interrupted by user")
        finally:
            self.cleanup()
        
        return True
    
    def cleanup(self):
        """Clean up resources"""
        if self.camera:
            self.camera.release()
        cv2.destroyAllWindows()
        logger.info("Live video cleanup completed")
