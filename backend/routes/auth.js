// backend/routes/auth.js

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { User, Role } = require('../models');

// This configures how your app will send emails through your Gmail account.
// Ensure your .env file contains EMAIL_USER and EMAIL_PASS (your 16-digit App Password).
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
        if (!user || password !== user.password) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }
        
        res.json({
            msg: 'Login successful',
            token: 'fake-jwt-token',
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


// --- ADD THIS ENTIRE BLOCK FOR THE "FORGOT PASSWORD" FEATURE ---

// @route   POST /api/auth/forgot-password
// @desc    Generates a reset code, saves it to the user, and emails it.
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            // For security, we don't reveal if the email was found or not.
            return res.json({ msg: 'If an account with that email exists, a reset code has been sent.' });
        }

        // Generate a random 6-digit code
        const resetCode = crypto.randomInt(100000, 999999).toString();
        
        // Save the code and an expiration time (10 minutes) to the user's record
        user.resetPasswordCode = resetCode;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes in milliseconds
        await user.save();

        // Send the email
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
        res.status(500).send('Server Error');
    }
});


// @route   POST /api/auth/reset-password
// @desc    Verifies the reset code and updates the user's password.

// --- THIS IS THE UPDATED RESET PASSWORD ROUTE ---
// @route   POST /api/auth/reset-password
// @desc    Verifies the code, updates the password, and sends a confirmation email.
router.post('/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    try {
        // 1. Find the user only if the code matches AND it has not expired
        const user = await User.findOne({
            email,
            resetPasswordCode: code,
            resetPasswordExpires: { $gt: Date.now() }, // Check if the code is still valid
        });

        if (!user) {
            // This is a critical security check
            return res.status(400).json({ msg: 'Invalid or expired reset code. Please request a new one.' });
        }

        // 2. The code is correct. Update the user's password.
        user.password = newPassword; // IMPORTANT: In a production app, you MUST HASH this password
        
        // 3. Invalidate the reset code so it cannot be used again
        user.resetPasswordCode = undefined;
        user.resetPasswordExpires = undefined;
        
        await user.save();
        console.log(`[Reset PW] Password successfully updated for: ${user.email}`);

        // --- 4. ADDED: Send a final confirmation email to the user ---
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Your Drishti Password Has Been Successfully Reset',
            text: `Hello ${user.name},\n\nThis is a confirmation that the password for your account associated with this email has just been changed.\n\nIf you did not perform this action, please contact our support team immediately.\n\nBest regards,\nThe Drishti Team`
        };
        await transporter.sendMail(mailOptions);
        console.log(`[Reset PW] Confirmation email sent to: ${user.email}`);
        
        // 5. Send the success response back to the frontend
        res.json({ msg: 'Password has been successfully reset. A confirmation email has been sent.' });

    } catch (err) {
        console.error("🔴 [Backend Error] /reset-password:", err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;