// backend/server.js

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
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// --- API Route Definitions ---
// [+] IMPORTANT: Place routes that use Multer (like /api/reports)
// [+] BEFORE express.json() and express.urlencoded() so Multer can
// [+] process the raw multipart/form-data body first.
app.use('/api/reports', require('./routes/reports')); // Multer-dependent route first

// [+] Now, apply generic body parsers for other routes
// [+] These will process requests *after* the '/api/reports' route has been checked.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
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