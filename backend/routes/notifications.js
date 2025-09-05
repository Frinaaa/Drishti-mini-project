// backend/routes/notifications.js

const express = require('express');
const router = express.Router();
const { Notification, User } = require('../models');

// A placeholder for authentication
const authMiddleware = async (req, res, next) => {
    const userId = req.header('user-id');
    if (!userId) return res.status(401).json({ msg: 'Authorization denied.' });
    req.user = { id: userId }; // Attach user ID to the request
    next();
};

router.get('/', authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id }).sort({ created_at: -1 });
        res.json(notifications);
    } catch (err) {
        console.error("🔴 [Backend Error] /api/notifications:", err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;