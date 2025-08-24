// /backend-service/server.js

const express = require('express');
const connectDB = require('./db');
const cors = require('cors');
const path = require('path'); // Standard Node.js module for handling file paths
const fs = require('fs'); // Standard Node.js module for interacting with the file system

// Point dotenv to the .env file in the project root directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Init Middleware
app.use(cors());
// INCREASED PAYLOAD LIMIT: To handle Base64 encoded files, the default limit
// might be too small. We increase it here to 50mb.
app.use(express.json({ limit: '50mb', extended: true }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


/*
 * ==================================================================
 * ADDED: Ensure the 'uploads' directory exists.
 * WHY: The application needs a place to store supporting documents
 * uploaded by NGOs. This code checks if the directory exists, and if
 * not, it creates it. This prevents errors when the first file is uploaded.
 * ==================================================================
 */
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/ngo', require('./routes/ngo'));
app.use('/api/reports', require('./routes/reports'));

/*
 * ==================================================================
 * ADDED: The new route for handling NGO requests.
 * WHY: This line registers the new router you will create in 
 * 'routes/requests.js'. All API calls related to submitting or
 * verifying requests (e.g., POST /api/requests/submit) will be
 * handled by this route.
 * ==================================================================
 */
app.use('/api/requests', require('./routes/requests'));

/*
 * ==================================================================
 * ADDED: Serve uploaded documents statically.
 * WHY: This makes the files stored in the 'uploads' directory
 * accessible via a URL. For example, a file saved as 'document.pdf'
 * can be accessed by the frontend at 'http://<your_server_url>/uploads/document.pdf',
 * allowing police users to view/download the evidence.
 * ==================================================================
 */
app.use('/uploads', express.static(UPLOADS_DIR));


app.get('/', (req, res) => res.send('Drishti API Running'));

// --- This logic is correct and remains unchanged ---
// Create a function to start the server only after the DB is connected
const startServer = async () => {
  try {
    // 1. Wait for the database connection to be established
    await connectDB();
    
    // 2. Once connected, start the Express server
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

  } catch (error) {
    console.error("Failed to connect to the database. Server is not starting.", error);
    process.exit(1);
  }
};

// Start the server
startServer();