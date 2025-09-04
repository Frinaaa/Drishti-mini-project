// backend/routes/users.js

const express = require('express');
const router = express.Router();
const { User, Role } = require('../models');
// Your multer imports can remain if you have them
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- Your existing multer setup for photo uploads can remain here ---
// ...

// --- THIS IS THE CORRECTED AND ROBUST "ADD ADMIN" ROUTE ---
// @route   POST /api/users/add-admin
// @desc    Creates a new user with the 'Police' role
// @access  Private (should be protected by an existing admin's token)
router.post('/add-admin', async (req, res) => {
    console.log('\n--- [Backend] /api/users/add-admin endpoint hit ---');
    try {
        // Step 1: Get the data from the frontend
        const { name, email, password } = req.body;
        console.log(`[1/5] Received data: Name=${name}, Email=${email}`);

        // Step 2: Perform server-side validation
        if (!name || !email || !password || password.length < 6) {
            console.log('🔴 [FAIL] Validation failed. Missing fields or short password.');
            return res.status(400).json({ msg: 'Please provide all fields. Password must be at least 6 characters.' });
        }
        console.log('✅ [SUCCESS] Initial validation passed.');

        // Step 3: Check if a user with this email already exists
        console.log(`[2/5] Checking if user with email '${email}' already exists...`);
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('🔴 [FAIL] User with this email already exists.');
            return res.status(400).json({ msg: 'A user with this email already exists.' });
        }
        console.log('✅ [SUCCESS] Email is available.');

        // Step 4: Find the 'Police' role document to get its ID
        console.log('[3/5] Finding "Police" role in the database...');
        const policeRole = await Role.findOne({ role_name: 'Police' });
        if (!policeRole) {
            console.log('🔴 [FAIL] "Police" role not found. Please ensure it exists in the "roles" collection.');
            return res.status(500).json({ msg: 'System error: "Police" role not found.' });
        }
        console.log(`✅ [SUCCESS] "Police" role found with ID: ${policeRole._id}`);

        // Step 5: Create and save the new user
        console.log('[4/5] Creating new User object...');
        const newUser = new User({
            name,
            email,
            password, // IMPORTANT: This should be hashed in a real-world app
            role: policeRole._id,
            status: 'Active',
        });
        
        console.log('[5/5] Attempting to save the new user to the "users" collection...');
        await newUser.save();
        console.log(`✅ [SUCCESS] User for '${name}' has been successfully saved to the database!`);

        // Send a success response back to the frontend
        res.status(201).json({ msg: `Admin account for '${name}' created successfully.` });

    } catch (err) {
        // This will now catch any error that happens during the .save() operation
        console.error('🔴 [CRITICAL FAIL] An error occurred during the add-admin process:', err);
        res.status(500).json({ msg: 'Server error while creating admin.', error: err.message });
    }
});
// --- END OF THE CORRECTED ROUTE ---


// ... Your other existing routes (GET /ngos, GET /:id, PUT /:id) go here ...

module.exports = router;