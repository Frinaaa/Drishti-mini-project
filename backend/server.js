// backend/server.js

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./db');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// --- 1. CORE MIDDLEWARE (MUST BE DEFINED BEFORE ROUTES) ---
app.use(cors());

// This middleware parses incoming JSON requests and makes `req.body` available.
// This is essential for your 'Add Admin' and 'Login' features.
app.use(express.json({ limit: '50mb' }));

// This middleware parses URL-encoded data.
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// --- 2. STATIC FILE SERVING ---
// This part is for serving uploaded images and is correct.
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PROFILE_UPLOADS_DIR = path.join(UPLOADS_DIR, 'profile');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(PROFILE_UPLOADS_DIR)) {
    fs.mkdirSync(PROFILE_UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/uploads/profile', express.static(PROFILE_UPLOADS_DIR));


// --- 3. API ROUTE DEFINITIONS ---
// Now that the body parsers are set up, all routes will work correctly.
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));
app.use('/api/requests', require('./routes/requests'));


// --- 4. ROOT ROUTE AND SERVER STARTUP ---
app.get('/', (req, res) => res.send('Drishti API is running successfully.'));

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => console.log(`✅ Server started on port ${PORT}`));
    } catch (error) {
        console.error("🔴 Failed to start server:", error);
        process.exit(1);
    }
};

startServer();