// /backend-service/routes/auth.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

// Import the User and Role models
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

    // Find the 'Family' role. Assumes this role is pre-seeded in the database.
    const familyRole = await Role.findOne({ role_name: 'Family' });
    if (!familyRole) {
        // This is a server configuration error
        return res.status(500).json({ msg: 'Default user role not found. Please contact support.' });
    }

    user = new User({
      name,
      email,
      password,
      role: familyRole._id, // Assign the 'Family' role's ID
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();
    res.status(201).json({ msg: 'User registered successfully' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get user info
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ msg: 'Please provide email and password' });
    }

    try {
        // Find user by email and populate their role information
        const user = await User.findOne({ email }).populate('role');
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Check if password matches
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }
        
        // Return user data (without the password)
        res.json({
            msg: 'Login successful',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role // Contains role_id and role_name
            }
        });

    } catch (err) {
        console.error(err.message);
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
            // Send a generic message to prevent email enumeration attacks
            return res.status(404).json({ msg: 'User not found' });
        }

        // Hash the new password and update the user document
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        await user.save();

        res.json({ msg: 'Password has been reset successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;