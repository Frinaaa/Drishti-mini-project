const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // RE-ADDED: Essential for secure password handling
const { User } = require('../models');
// NOTE: You should also add an authentication middleware to protect these routes.
// const auth = require('../middleware/auth');

// @route   GET api/users/:id
// @desc    Get user data by ID
// @access  Private (should be protected)
router.get('/:id', /* auth, */ async (req, res) => {
    try {
        // Authorization check should be here: e.g., if(req.user.id !== req.params.id) ...
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ user });
    } catch (err) {
        console.error(err.message);
        // Handle cases where the ID format is invalid
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/users/:id
// @desc    Update user profile data
// @access  Private (should be protected)
router.put('/:id', /* auth, */ async (req, res) => {
    const { name, email, gender, currentPassword, newPassword } = req.body;

    try {
        // Authorization check should be here: e.g., if(req.user.id !== req.params.id) ...
        
        // Find the user in the database, including the password field for comparison
        let user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        
        // Update standard fields if they are provided
        if (name) user.name = name;
        if (email) user.email = email;
        if (gender) user.gender = gender;

        // --- FIXED: Secure Password Update Logic ---
        if (newPassword && currentPassword) {
            // 1. Securely compare the provided current password with the hashed password in the DB
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Current password is incorrect' });
            }

            // 2. Hash the new password before saving it to the database
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        // Save all the updated information
        await user.save();
        
        // Create a user object to return, excluding the password hash
        const updatedUser = {
            _id: user._id,
            name: user.name,
            email: user.email,
            gender: user.gender,
        };

        res.json({ msg: 'Profile updated successfully', user: updatedUser });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;