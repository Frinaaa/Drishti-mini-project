"""
Drishti File System Monitor Module
===================================

Monitors file system for changes and triggers database updates.
"""

import os
import time
import asyncio
import logging
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileCreatedEvent

logger = logging.getLogger(__name__)

class ReportsFileHandler(FileSystemEventHandler):
    """Monitors the reports directory for new image uploads"""
    
    def __init__(self, rebuild_callback, loop):
        self.rebuild_callback = rebuild_callback
        self.loop = loop  # Store reference to main event loop
        self.last_trigger = 0
        super().__init__()
    
    def on_created(self, event):
        if isinstance(event, FileCreatedEvent) and not event.is_directory:
            file_path = event.src_path
            if file_path.lower().endswith(('.png', '.jpg', '.jpeg')):
                # Debounce: Only trigger once per 2 seconds
                current_time = time.time()
                if current_time - self.last_trigger > 2:
                    self.last_trigger = current_time
                    logger.info(f"New image uploaded: {os.path.basename(file_path)}")
                    # Schedule incremental update from thread-safe context
                    if self.loop and not self.loop.is_closed():
                        asyncio.run_coroutine_threadsafe(self.rebuild_callback(), self.loop)

class FileSystemMonitor:
    """Manages file system monitoring for automatic database updates"""
    
    def __init__(self, database_manager, db_path: str):
        self.database_manager = database_manager
        self.db_path = db_path
        self.observer = None
        self.event_handler = None
    
    def start_monitoring(self, loop):
        """Start monitoring the database path for changes"""
        try:
            # Pass the current event loop to the file handler
            self.event_handler = ReportsFileHandler(
                self.database_manager.update_database_async, 
                loop
            )
            self.observer = Observer()
            self.observer.schedule(self.event_handler, self.db_path, recursive=False)
            self.observer.start()
            logger.info(f"Started monitoring {self.db_path} for new uploads...")
            return True
        except Exception as e:
            logger.error(f"Could not start file watcher: {e}")
            return False
    
    def stop_monitoring(self):
        """Stop monitoring the file system"""
        if self.observer:
            self.observer.stop()
            self.observer.join()
            logger.info("File system monitoring stopped.")
