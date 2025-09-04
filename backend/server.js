const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./db');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// --- Core Middleware ---
app.use(cors());

// --- Static File Serving (Crucial for Images) ---
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PROFILE_UPLOADS_DIR = path.join(UPLOADS_DIR, 'profile'); // New: Profile uploads directory

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
// New: Create profile uploads directory
if (!fs.existsSync(PROFILE_UPLOADS_DIR)) {
    fs.mkdirSync(PROFILE_UPLOADS_DIR, { recursive: true });
}

app.use('/uploads', express.static(UPLOADS_DIR));
// New: Serve profile uploads specifically
app.use('/uploads/profile', express.static(PROFILE_UPLOADS_DIR));


// --- API Route Definitions ---
// [+] IMPORTANT: Place routes that use Multer (like /api/reports and now /api/users for profile images)
// [+] BEFORE express.json() and express.urlencoded() so Multer can
// [+] process the raw multipart/form-data body first.
app.use('/api/reports', require('./routes/reports')); // Multer-dependent route first
app.use('/api/users', require('./routes/users')); // Moved here because it now also uses Multer for profile photos


// [+] Now, apply generic body parsers for other routes
// [+] These will process requests after the '/api/reports' and '/api/users' routes have been checked.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/requests', require('./routes/requests'));

app.get('/', (req, res) => res.send('Drishti API is running successfully.'));

// --- Server Startup Logic ---
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