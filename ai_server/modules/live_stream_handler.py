# modules/live_stream_handler.py

from __future__ import annotations
import base64
import time
import cv2
import asyncio
import numpy as np
import logging
from fastapi import WebSocket
from deepface import DeepFace

from .image_processor import ImageProcessor
from .face_recognition import FaceRecognizer
from .config import MATCH_COOLDOWN, MIN_FACE_SIZE, MODEL_NAME, LIVE_STREAM_CONFIDENCE_THRESHOLD

logger = logging.getLogger(__name__)

DETECTOR_BACKEND = 'retinaface'

class LiveStreamHandler:
    """
    Handles real-time video analysis over a WebSocket with high efficiency.
    Uses two-stage detection and a stateful cooldown to prevent spam.
    """
    def __init__(self, face_recognizer: FaceRecognizer, image_processor: ImageProcessor):
        self.face_recognizer = face_recognizer
        self.image_processor = image_processor
        self.face_cascade = self.image_processor.initialize_face_detector()
        self.recent_matches = {}
        self.is_processing_heavy_task = False
        self.websocket: WebSocket | None = None
        self.loop: asyncio.AbstractEventLoop | None = None

    def _run_blocking_face_analysis(self, frame: np.ndarray):
        """
        This synchronous function contains all the CPU-heavy code.
        It's designed to be run in a separate thread via run_in_executor.
        """
        try:
            logger.info("BACKGROUND: Starting heavy analysis...")
            
            embedding_objs = DeepFace.represent(
                img_path=frame, model_name=MODEL_NAME,
                enforce_detection=False, detector_backend='skip'
            )
            
            if not embedding_objs or not embedding_objs[0]["embedding"]:
                 logger.warning("BACKGROUND: DeepFace.represent failed to generate an embedding.")
                 return

            logger.info("BACKGROUND: Successfully generated embedding.")
            frame_embedding = embedding_objs[0]["embedding"]
            
            match_result = self.face_recognizer.find_match_from_stream(
                np.array(frame_embedding), 
                threshold=LIVE_STREAM_CONFIDENCE_THRESHOLD
            )
            
            logger.info(f"BACKGROUND: Match search result: {match_result}")

            if match_result:
                filename = match_result['filename']
                current_time = time.time()
                
                if filename not in self.recent_matches or (current_time - self.recent_matches[filename] > MATCH_COOLDOWN):
                    self.recent_matches[filename] = current_time
                    logger.info(f"✅ FOUND and sending match to client: {filename}")
                    
                    final_payload = {
                        "face_detected": True,
                        "face_box": None,
                        "match_result": match_result
                    }
                    if self.websocket and self.loop:
                        asyncio.run_coroutine_threadsafe(
                            self.websocket.send_json(final_payload),
                            self.loop
                        )
                else:
                    logger.info(f"🚫 COOLED DOWN match for: {filename}")
        except Exception as e:
            logger.error(f"CRITICAL ERROR in background task: {e}", exc_info=True)
        finally:
            self.is_processing_heavy_task = False
            logger.info("BACKGROUND: Heavy analysis finished.")


    async def handle_websocket(self, websocket: WebSocket):
        """The main loop to handle a single client WebSocket connection."""
        await websocket.accept()
        logger.info("WebSocket connection established for live scanning.")
        
        self.websocket = websocket
        self.loop = asyncio.get_running_loop()
        
        keep_alive_counter = 0

        try:
            while True:
                base64_data = await websocket.receive_text()
                
                keep_alive_counter += 1
                if keep_alive_counter > 50:
                    await websocket.send_json({"type": "ping"})
                    keep_alive_counter = 0

                try:
                    if 'base64,' in base64_data:
                        base64_data = base64_data.split(',', 1)[1]
                    missing_padding = len(base64_data) % 4
                    if missing_padding:
                        base64_data += '=' * (4 - missing_padding)
                    image_data = base64.b64decode(base64_data)
                except Exception as decode_error:
                    logger.warning(f"Skipping frame due to base64 decode error: {decode_error}")
                    continue

                np_arr = np.frombuffer(image_data, np.uint8)
                frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                if frame is None: continue

                response_data = {"face_detected": False, "face_box": None, "match_result": None}
                faces = self.image_processor.detect_faces(frame, self.face_cascade, min_face_size=MIN_FACE_SIZE)

                if len(faces) > 0:
                    primary_face_rect = sorted(faces, key=lambda rect: rect[2] * rect[3], reverse=True)[0]
                    (x, y, w, h) = primary_face_rect
                    response_data["face_detected"] = True
                    # =============================================================
                    # === THIS IS THE SYNTAX FIX                                ===
                    # =============================================================
                    response_data["face_box"] = {"x": int(x), "y": int(y), "width": int(w), "height": int(h)}
                    # =============================================================
                    # === END OF FIX                                            ===
                    # =============================================================

                    if not self.is_processing_heavy_task:
                        self.is_processing_heavy_task = True
                        self.loop.run_in_executor(None, self._run_blocking_face_analysis, frame)

                await websocket.send_json(response_data)
                await asyncio.sleep(0.05)
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            logger.info("WebSocket connection closed.")
            self.websocket = None
            self.loop = None