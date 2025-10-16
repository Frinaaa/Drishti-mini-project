# ai_server/modules/live_stream_handler.py

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
    def __init__(self, face_recognizer: FaceRecognizer, image_processor: ImageProcessor):
        self.face_recognizer = face_recognizer
        self.image_processor = image_processor
        self.face_cascade = self.image_processor.initialize_face_detector()
        
        self.processing = False
        self.recent_matches = {}
        self.MATCH_COOLDOWN_SECONDS = 10

    def _process_frame_sync(self, frame: np.ndarray) -> dict:
        self.processing = True
        try:
            # This call is now simpler and more direct, using the refactored module
            result = self.face_recognizer.find_match_in_memory(frame)
            if result and result.get('match_found'):
                filename = result.get('filename')
                current_time = time.time()
                if filename in self.recent_matches and (current_time - self.recent_matches[filename]) < self.MATCH_COOLDOWN_SECONDS:
                    return None
                self.recent_matches[filename] = current_time
                return result
            return None
        except Exception as e:
            logger.error(f"WebSocket frame processing error: {e}")
            return None
        finally:
            self.processing = False

    async def handle_websocket(self, websocket: WebSocket):
        await websocket.accept()
        logger.info("WebSocket connection established for data streaming.")
        
        frame_count = 0
        try:
            while True:
                base64_data = await websocket.receive_text()
                if 'base64,' in base64_data:
                    base64_data = base64_data.split(',', 1)[1]
                
                image_data = base64.b64decode(base64_data)
                np_arr = np.frombuffer(image_data, np.uint8)
                frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

                if frame is None: continue

                new_match_result = None
                if frame_count % 10 == 0 and not self.processing:
                    new_match_result = self._process_frame_sync(frame)
                
                face_locations = self.image_processor.detect_faces(frame, self.face_cascade)
                
                response_data = {"face_detected": False, "face_box": None, "match_result": new_match_result}

                if len(face_locations) > 0:
                    primary_face = sorted(face_locations, key=lambda r: r[2] * r[3], reverse=True)[0]
                    (x, y, w, h) = primary_face
                    response_data["face_detected"] = True
                    response_data["face_box"] = {"x": int(x), "y": int(y), "width": int(w), "height": int(h)}

                await websocket.send_json(response_data)
                frame_count += 1
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            logger.info("WebSocket connection closed.")