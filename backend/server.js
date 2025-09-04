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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- Static File Serving (Crucial for Images) ---
// This section makes your 'uploads' folder publicly accessible.
const UPLOADS_DIR = path.join(__dirname, 'uploads');
// Safety check: Create the 'uploads' directory if it doesn't exist.
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
// Any request to `/uploads/` will now serve files from the backend/uploads directory.
app.use('/uploads', express.static(UPLOADS_DIR));

// --- API Route Definitions ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reports', require('./routes/reports'));
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