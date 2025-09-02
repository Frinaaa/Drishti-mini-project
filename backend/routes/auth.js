// backend/routes/auth.js

const express = require('express');
const router = express.Router();
const { User, Role } = require('../models');

// @route   POST api/auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) return res.status(400).json({ msg: 'Please enter all fields' });
    if (await User.findOne({ email })) return res.status(400).json({ msg: 'User already exists' });

    const familyRole = await Role.findOne({ role_name: 'Family' });
    if (!familyRole) return res.status(500).json({ msg: 'Default role not found.' });

    const newUser = new User({ name, email, password, role: familyRole._id });
    await newUser.save();
    res.status(201).json({ msg: 'User registered successfully' });
  } catch (err) {
    console.error("🔴 [Backend Error] /api/auth/signup:", err);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) return res.status(400).json({ msg: 'Please provide email and password' });

        const user = await User.findOne({ email }).populate('role');
        if (!user || password !== user.password) { // In a real app, use bcrypt to compare passwords
            return res.status(400).json({ msg: 'Invalid credentials' });
        }
        
        // Return all necessary user data, including role and status
        res.json({
            msg: 'Login successful',
            token: 'fake-jwt-token', // Placeholder for a real JWT
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });
    } catch (err) {
        console.error("🔴 [Backend Error] /api/auth/login:", err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;