const mongoose = require('mongoose');

// This function is responsible for establishing the connection to your MongoDB database.
const connectDB = async () => {
  try {
    // --- STEP 1: PRE-CONNECTION CHECK ---
    // First, verify that the MONGO_URI environment variable has been loaded successfully.
    // This is the most common point of failure.
    if (!process.env.MONGO_URI) {
      console.error('🔴 FATAL ERROR: MONGO_URI is not defined.');
      console.error('🔴 Please ensure you have a .env file in the project root with the MONGO_URI variable.');
      process.exit(1); // Exit the application immediately
    }
    
    // --- STEP 2: ATTEMPT CONNECTION ---
    // Log a message indicating that the connection process is starting.
    // For security, we sanitize the URI to hide the password in logs.
    const sanitizedUri = process.env.MONGO_URI.replace(/:([^:]+)@/, ':****@');
    console.log(`[DB] Attempting to connect to MongoDB...`);
    // console.log(`[DB] URI: ${sanitizedUri}`); // Uncomment this line if you need to debug the URI path itself

    // Use Mongoose to connect to the database. The `await` keyword will pause
    // the function here until the connection is either successful or throws an error.
    await mongoose.connect(process.env.MONGO_URI);

    // --- STEP 3: HANDLE SUCCESS ---
    // If the `await` command completes without error, the connection is successful.
    console.log('✅ MongoDB Connected successfully!');

  } catch (err) {
    /*
     * ==================================================================
     * --- STEP 4: HANDLE FAILURE ---
     * If mongoose.connect() fails for any reason (wrong password, IP not whitelisted,
     * network issue, etc.), the `try` block is aborted, and this `catch` block runs.
     * ==================================================================
     */
    console.error('🔴 FATAL ERROR: MongoDB connection failed!');
    
    // Log the specific, detailed error message provided by Mongoose.
    // This is the most important clue for debugging.
    console.error('🔴 Reason:', err.message);
    
    // Exit the entire application process with a "failure" code (1).
    // This prevents the server from running in a broken state without a database.
    process.exit(1);
  }
};

// Export the function so it can be called from your main `server.js` file.
module.exports = connectDB;