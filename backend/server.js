// /backend-service/server.js

const express = require('express');
const connectDB = require('./db');
const cors = require('cors');
const path = require('path'); // ADDED: to help resolve the path to .env

// UPDATED: Point dotenv to the .env file in the project root directory
// This makes the server work regardless of where you run `node server.js` from.
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Init Middleware
app.use(cors());
app.use(express.json({ extended: false }));

// Define Routes
app.use('/api/auth', require('./routes/auth'));
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