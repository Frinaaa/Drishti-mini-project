const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// STEP 1: Import the connectDB function from your db.js file.
// This function contains all the logic for connecting to MongoDB.
const connectDB = require('./db');

// STEP 2: Load environment variables from the .env file in the project root.
// This makes variables like your MONGO_URI available via `process.env`.
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// --- App Initialization ---
const app = express();
const PORT = process.env.PORT || 5000;


// --- Core Middleware ---
// Enables Cross-Origin Resource Sharing so your frontend can talk to this backend.
app.use(cors());
// Parses incoming JSON request bodies. The limit is increased to handle large Base64 files.
app.use(express.json({ limit: '50mb' }));
// Parses URL-encoded data.
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// --- Static File Serving ---
// This section makes your 'uploads' folder publicly accessible.
const UPLOADS_DIR = path.join(__dirname, 'uploads');
// Safety check: Create the 'uploads' directory if it doesn't exist.
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}
// Any request to `/uploads/some-file.pdf` will now serve the file from the backend/uploads directory.
app.use('/uploads', express.static(UPLOADS_DIR));


// --- API Route Definitions ---
// All requests starting with `/api/auth` will be handled by the `auth.js` file.
app.use('/api/auth', require('./routes/auth'));
// All requests starting with `/api/users` will be handled by the `users.js` file.
app.use('/api/users', require('./routes/users'));
// All requests starting with `/api/reports` will be handled by the `reports.js` file.
app.use('/api/reports', require('./routes/reports'));
// All requests starting with `/api/requests` will be handled by the `requests.js` file.
app.use('/api/requests', require('./routes/requests'));
// NOTE: The '/api/ngo' route is commented out as its functionality has been moved
// into the 'users.js' and 'requests.js' files for better organization.
// app.use('/api/ngo', require('./routes/ngo'));


// A simple root route to confirm that the API is running.
app.get('/', (req, res) => res.send('Drishti API Running'));


// --- Server Startup Logic ---
// This function ensures that the server does not start listening for requests
// until it has successfully connected to the database.
const startServer = async () => {
  try {
    // First, wait for the database connection to be established.
    await connectDB();
    
    // Only after the DB is connected, start the Express server.
    app.listen(PORT, () => console.log(`✅ Server started successfully on port ${PORT}`));

  } catch (error) {
    // If connectDB() throws an error, it will be caught here, and the server will not start.
    console.error("🔴 Failed to start server due to database connection error.", error);
    process.exit(1);
  }
};

// --- Start the Server ---
startServer();