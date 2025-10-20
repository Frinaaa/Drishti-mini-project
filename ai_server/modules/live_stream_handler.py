# modules/live_stream_handler.py

import base64
import time
import cv2
import numpy as np
import logging
from fastapi import WebSocket

from .image_processor import ImageProcessor
from .face_recognition import FaceRecognizer

logger = logging.getLogger(__name__)

class LiveStreamHandler:
    """
    Handles real-time video analysis over a WebSocket.
    Receives frames, processes them, and sends back JSON data (not video).
    """

    def __init__(self, face_recognizer: FaceRecognizer, image_processor: ImageProcessor):
        self.face_recognizer = face_recognizer
        self.image_processor = image_processor
        self.face_cascade = self.image_processor.initialize_face_detector()
        
        self.processing = False
        self.current_result = None
        self.last_match_time = 0

    def _process_frame_sync(self, frame: np.ndarray):
        """Processes a frame for a match and updates the handler's state."""
        self.processing = True
        try:
            result = self.face_recognizer.find_match_in_memory(frame)
            
            if result and result.get('match_found'):
                self.current_result = {
                    "match_found": True,
                    "matched_image": result.get('filename', 'Unknown'),
                    "confidence": result.get('confidence', 0)
                }
            else:
                self.current_result = {"match_found": False}
            
            self.last_match_time = time.time()
        except Exception as e:
            logger.error(f"WebSocket frame processing error: {e}")
            self.current_result = {"match_found": False, "error": str(e)}
        finally:
            self.processing = False

    async def handle_websocket(self, websocket: WebSocket):
        """The main loop to handle a single client WebSocket connection."""
        await websocket.accept()
        logger.info("WebSocket connection established for data streaming.")
        
        frame_count = 0
        try:
            while True:
                # 1. Receive and decode the frame from the mobile app
                base64_data = await websocket.receive_text()
                if 'base64,' in base64_data:
                    base64_data = base64_data.split(',', 1)[1]
                
                image_data = base64.b64decode(base64_data)
                np_arr = np.frombuffer(image_data, np.uint8)
                frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

                if frame is None:
                    continue

                # 2. Process for a match periodically
                if frame_count % 10 == 0 and not self.processing: # Slower processing is fine
                    self._process_frame_sync(frame)
                
                # 3. Always detect faces for the overlay
                face_locations = self.image_processor.detect_faces(frame, self.face_cascade)
                
                response_data = {
                    "face_detected": False,
                    "face_box": None,
                    "match_result": None
                }

                if len(face_locations) > 0:
                    # Get the largest face for the UI
                    primary_face = sorted(face_locations, key=lambda rect: rect[2] * rect[3], reverse=True)[0]
                    (x, y, w, h) = primary_face
                    response_data["face_detected"] = True
                    response_data["face_box"] = {"x": int(x), "y": int(y), "width": int(w), "height": int(h)}

                # 4. Attach recent match results
                if self.current_result and time.time() - self.last_match_time < 3:
                    response_data["match_result"] = self.current_result
                
                # 5. Send the JSON data back to the app
                await websocket.send_json(response_data)
                
                frame_count += 1
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            logger.info("WebSocket connection closed.")