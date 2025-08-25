const express = require('express');
const router = express.Router();
const { User, Role } = require('../models');

// @route   POST api/auth/signup
// @desc    Register a family member
// @access  Public
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const familyRole = await Role.findOne({ role_name: 'Family' });
    if (!familyRole) {
        return res.status(500).json({ msg: 'Default user role not found. Please contact support.' });
    }

    user = new User({
      name,
      email,
      password, // Storing password as plain text
      role: familyRole._id,
    });

    await user.save();
    res.status(201).json({ msg: 'User registered successfully' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/*
 * ROUTE: POST api/auth/login (UPDATED)
 * PURPOSE: Authenticates users and now ONLY blocks NGOs that are 'Rejected'.
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
        // This block now only checks if the user's status is 'Rejected'.
        // If the status is 'Pending' or 'Approved', they will be allowed to log in.
        if (user.role && user.role.role_name === 'NGO') {
            if (user.verification_status === 'Rejected') {
                const message = 'Your registration has been rejected. Please contact support.';
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
                verification_status: user.verification_status // Include status in response
            }
        });

    } catch (err) {
        console.error("Error in /login:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/reset-password
// @desc    Reset user password
// @access  Public
router.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ msg: 'Please provide email and a new password' });
    }
     if (newPassword.length < 6) {
        return res.status(400).json({ msg: 'Password must be at least 6 characters long' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        user.password = newPassword; // Storing new password as plain text
        
        await user.save();

        res.json({ msg: 'Password has been reset successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;