const express = require('express');
const router = express.Router();
const { User, Role } = require('../models');

// --- Family Signup Route (Unchanged) ---
router.post('/signup', async (req, res) => { /* ... your existing code ... */ });

/*
 * ROUTE: POST api/auth/login (UPDATED)
 * PURPOSE: Authenticates users and blocks NGOs that are not yet 'Approved'.
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: 'Please provide email and password' });

    try {
        const user = await User.findOne({ email }).populate('role');
        if (!user || password !== user.password) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }
        
        // --- THE UPDATED SECURITY CHECK ---
        if (user.role && user.role.role_name === 'NGO') {
            if (user.verification_status !== 'Approved') {
                let message = 'Your account is pending verification.';
                if (user.verification_status === 'Rejected') {
                    message = 'Your registration has been rejected. Please contact support.';
                }
                return res.status(401).json({ msg: message });
            }
        }

        // If all checks pass, return user data
        res.json({
            msg: 'Login successful',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                verification_status: user.verification_status
            }
        });

    } catch (err) {
        console.error("Error in /login:", err.message);
        res.status(500).send('Server Error');
    }
});

// --- Reset Password Route (Unchanged) ---
router.post('/reset-password', async (req, res) => { /* ... your existing code ... */ });

module.exports = router;