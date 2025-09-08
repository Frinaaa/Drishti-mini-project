# backend/database.py

import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# Global variable to hold the database instance
db = None

def connect_db():
    global db
    # Get the MongoDB connection string from your .env file
    mongo_uri = os.environ.get("MONGO_URI")

    if not mongo_uri:
        print("🔴 FATAL ERROR: MONGO_URI is not defined in the .env file.")
        exit(1)

    try:
        # Create a new client and connect to the server
        client = MongoClient(mongo_uri)
        
        # --- IMPORTANT ---
        # Replace 'Drishti' with the actual name of your database if it's different.
        db = client['Drishti'] 
        
        # The ismaster command is cheap and does not require auth.
        client.admin.command('ismaster')
        print("✅ MongoDB Connected successfully!")
    except ConnectionFailure as e:
        print(f"🔴 FATAL ERROR: MongoDB connection failed: {e}")
        exit(1)

# A helper function to easily access the database instance from other files
def get_db():
    if db is None:
        connect_db()
    return db