// backend/routes/users.js

const express = require('express');
const router = express.Router();
const { User, Role } = require('../models');

// @route   GET /api/users/ngos
router.get('/ngos', async (req, res) => {
    try {
        const ngoRole = await Role.findOne({ role_name: 'NGO' });
        if (!ngoRole) return res.status(404).json({ msg: 'System error: NGO role not found.' });
        const ngos = await User.find({ role: ngoRole._id }).select('-password');
        res.json(ngos);
    } catch (err) {
        console.error("🔴 [Backend Error] /api/users/ngos:", err);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/users/:id
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json({ user });
    } catch (err) {
        console.error(`🔴 [Backend Error] /api/users/${req.params.id}:`, err);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/users/:id
router.put('/:id', async (req, res) => {
    const { name, email, gender } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        
        if (name) user.name = name;
        if (email) user.email = email;
        if (gender) user.gender = gender;
        
        await user.save();
        const updatedUser = await User.findById(req.params.id).select('-password');
        res.json({ msg: 'Profile updated successfully', user: updatedUser });
    } catch (err) {
        console.error(`🔴 [Backend Error] /api/users/${req.params.id} (PUT):`, err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;