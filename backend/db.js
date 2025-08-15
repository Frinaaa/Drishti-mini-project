// /backend-service/db.js

const mongoose = require('mongoose');

// It's good practice to handle the .env loading in the main server file,
// but we'll leave this as is for now.

const connectDB = async () => {
  try {
    // --- THIS IS THE CRUCIAL DEBUGGING LINE ---
    // It will print the exact value that Mongoose is about to use.
    console.log("DEBUG: Attempting to connect with this URI:", process.env.MONGO_URI);
    // -----------------------------------------

    // Add a check to ensure the environment variable is loaded before trying to connect.
    if (!process.env.MONGO_URI) {
      console.error('ERROR: MONGO_URI is not defined. Please ensure you have a .env file in the project root with the MONGO_URI variable.');
      process.exit(1);
    }
    // The options object is no longer needed for modern Mongoose versions.
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB Connection Failed:', err.message); // Print a more specific error
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;