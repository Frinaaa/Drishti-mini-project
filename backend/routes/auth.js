// backend/routes/auth.js

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
// const bcrypt = require('bcryptjs'); // REMOVED: Hashing is disabled
const jwt = require('jsonwebtoken'); // Kept for secure session tokens
const { User, Role } = require('../models');

// Helper to fetch and validate the JWT secret from environment variables.
// Returns the secret string or null if not configured.
function getJwtSecret() {
    if (!process.env.JWT_SECRET) {
        console.error('🔴 [Backend Config] JWT_SECRET is not set in the environment. Set JWT_SECRET in your .env or environment variables.');
        return null;
    }
    return process.env.JWT_SECRET;
}

// This configures how your app will send emails through your Gmail account.
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use false for port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


// @route   POST api/auth/signup
// [MODIFIED] Password is now saved as plain text.
router.post('/signup', async (req, res) => {
    const { name, email, password, pinCode } = req.body;
  try {
    if (!name || !email || !password) return res.status(400).json({ msg: 'Please enter all fields' });
    if (await User.findOne({ email })) return res.status(400).json({ msg: 'User already exists' });

    const familyRole = await Role.findOne({ role_name: 'Family' });
    if (!familyRole) return res.status(500).json({ msg: 'Default role not found.' });

    // Password is assigned directly without hashing
    // pinCode is optional but saved when provided
    const newUser = new User({ name, email, password, role: familyRole._id, pinCode });
    
    await newUser.save();
    res.status(201).json({ msg: 'User registered successfully' });
  } catch (err) {
    console.error("🔴 [Backend Error] /api/auth/signup:", err);
    res.status(500).json({ msg: 'Server Error' });
  }
});


// @route   POST api/auth/login
// [MODIFIED] For FAMILY login. Uses plain text password comparison.
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) return res.status(400).json({ msg: 'Please provide email and password' });

        const user = await User.findOne({ email }).populate('role');
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }
        
        // Simple string comparison instead of bcrypt.compare
        if (password !== user.password) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Create JWT payload
        const payload = { user: { id: user.id, role: user.role.role_name } };
        
        const jwtSecret = getJwtSecret();
        if (!jwtSecret) {
            return res.status(500).json({ msg: 'Server misconfiguration: JWT secret is not set. Please set JWT_SECRET and restart the server.' });
        }

        jwt.sign(payload, jwtSecret, { expiresIn: '5d' }, (err, token) => {
            if (err) {
                console.error('🔴 [JWT Error] Failed to sign token:', err);
                return res.status(500).json({ msg: 'Failed to create authentication token.' });
            }
            res.json({
                msg: 'Login successful',
                token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    pinCode: user.pinCode,
                    status: user.status
                }
            });
        });
    } catch (err) {
        console.error("🔴 [Backend Error] /api/auth/login:", err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/auth/ngo-login
// [MODIFIED] For NGO login. Uses plain text password comparison.
router.post('/ngo-login', async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ msg: 'Please provide email and password' });
        }

        const ngoRole = await Role.findOne({ role_name: 'NGO' });
        if (!ngoRole) return res.status(500).json({ msg: 'NGO role not found in database.' });

        const user = await User.findOne({ email, role: ngoRole._id });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Simple string comparison instead of bcrypt.compare
        if (password !== user.password) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }
        
        if (user.status !== 'Active') {
            return res.status(403).json({ msg: `Your account status is: ${user.status}. You cannot log in until it is 'Approved'.` });
        }

        const payload = { user: { id: user.id, role: 'NGO' } };

        const jwtSecret = getJwtSecret();
        if (!jwtSecret) {
            return res.status(500).json({ msg: 'Server misconfiguration: JWT secret is not set. Please set JWT_SECRET and restart the server.' });
        }

        jwt.sign(payload, jwtSecret, { expiresIn: '5d' }, (err, token) => {
            if (err) {
                console.error('🔴 [JWT Error] Failed to sign token (NGO):', err);
                return res.status(500).json({ msg: 'Failed to create authentication token.' });
            }
            res.json({
                msg: 'NGO login successful',
                token,
                user: {
                    _id: user.id,
                    name: user.name,
                    email: user.email,
                    pinCode: user.pinCode,
                    role: { role_name: 'NGO' },
                    status: user.status
                }
            });
        });

    } catch (err) {
        console.error("🔴 [Backend Error] /api/auth/ngo-login:", err);
        res.status(500).json({ msg: 'Server Error' });
    }
});


// @route   POST /api/auth/forgot-password
// (This route does not involve password checking, so it remains unchanged)
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ msg: 'If an account with that email exists, a reset code has been sent.' });
        }

        const resetCode = crypto.randomInt(100000, 999999).toString();
        
        user.resetPasswordCode = resetCode;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Your Drishti Password Reset Code',
            text: `You requested a password reset.\n\nYour verification code is: ${resetCode}\n\nThis code will expire in 10 minutes.`
        };
        await transporter.sendMail(mailOptions);
        
        res.json({ msg: 'If an account with that email exists, a reset code has been sent.' });
    } catch (err) {
        console.error("🔴 [Backend Error] /forgot-password:", err);
        res.status(500).json({ msg: 'Server Error' });
    }
});


// @route   POST /api/auth/reset-password
// [MODIFIED] Saves the new password as plain text.
router.post('/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    try {
        const user = await User.findOne({
            email,
            resetPasswordCode: code,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid or expired reset code. Please request a new one.' });
        }

        // Saves the new password directly without hashing
        user.password = newPassword;
        
        user.resetPasswordCode = undefined;
        user.resetPasswordExpires = undefined;
        
        await user.save();
        console.log(`[Reset PW] Password successfully updated for: ${user.email}`);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Your Drishti Password Has Been Successfully Reset',
            text: `Hello ${user.name},\n\nThis is a confirmation that the password for your account associated with this email has just been changed.\n\nIf you did not perform this action, please contact our support team immediately.\n\nBest regards,\nThe Drishti Team`
        };
        await transporter.sendMail(mailOptions);
        console.log(`[Reset PW] Confirmation email sent to: ${user.email}`);
        
        res.json({ msg: 'Password has been successfully reset. A confirmation email has been sent.' });

    } catch (err) {
        console.error("🔴 [Backend Error] /reset-password:", err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;