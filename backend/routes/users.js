const express = require('express');
const router = express.Router();
// REMOVED: bcrypt is not needed to maintain consistency with your auth.js file.
// const bcrypt = require('bcryptjs'); 
const { User } = require('../models');

// @route   GET api/users/:id
// @desc    Get user data by ID
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/users/:id
// @desc    Update user profile data
router.put('/:id', async (req, res) => {
    const { name, email, gender, currentPassword, newPassword } = req.body;

    // --- DEBUGGING: See what the backend receives ---
    console.log(`[BACKEND LOG] Received update request for user ID: ${req.params.id}`);
    console.log(`[BACKEND LOG] Request Body:`, req.body);

    try {
        let user = await User.findById(req.params.id);
        if (!user) {
            console.log(`[BACKEND LOG] User with ID ${req.params.id} not found.`);
            return res.status(404).json({ msg: 'User not found' });
        }
        
        console.log(`[BACKEND LOG] Found user: ${user.name}`);

        // Update standard fields
        if (name) user.name = name;
        if (email) user.email = email;
        if (gender) user.gender = gender;

        // --- UPDATED: Password Update Logic (NO HASHING) ---
        if (newPassword && currentPassword) {
            // 1. Verify the current password is correct (plain text comparison)
            if (currentPassword !== user.password) {
                console.log(`[BACKEND LOG] Password update failed: Incorrect current password.`);
                return res.status(400).json({ msg: 'Current password is incorrect' });
            }

            // 2. Update to the new password (plain text)
            user.password = newPassword;
            console.log(`[BACKEND LOG] Password has been updated.`);
        }

        // The most important step: save all changes to the database
        await user.save();
        console.log(`[BACKEND LOG] user.save() was called successfully!`);
        
        const updatedUser = {
            _id: user._id,
            name: user.name,
            email: user.email,
            gender: user.gender,
        };

        res.json({ msg: 'Profile updated successfully', user: updatedUser });

    } catch (err) {
        console.error('[BACKEND ERROR]', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;