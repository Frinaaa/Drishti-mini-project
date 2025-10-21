const express = require('express');
const router = express.Router();
const { User, Role, Notification, MissingReport } = require('../models');
const authMiddleware = require('../middleware/auth');
const mongoose = require('mongoose');

// Utility function for consistent date boundary calculations
function getTodayDateBoundaries() {
    const today = new Date();
    // Use UTC to avoid timezone issues and ensure consistent date boundaries
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));
    return { startOfDay, endOfDay };
}

/*
 * ROUTE: POST /api/ngo/register (UPDATED: Now lives here)
 * PURPOSE: Allows a new NGO to register.
 */
router.post('/register', async (req, res) => {
    const { ngoName, email, password } = req.body;
    if (!ngoName || !email || !password) {
        return res.status(400).json({ msg: 'Please enter at least the NGO Name, Email, and Password.' });
    }
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'An account with this email already exists.' });

        const ngoRole = await Role.findOne({ role_name: 'NGO' });
        if (!ngoRole) return res.status(500).json({ msg: '"NGO" user role not found. Please contact an administrator.' });

        user = new User({
            name: ngoName,
            email,
            password,
            role: ngoRole._id,
            status: 'Pending', // New NGOs start as 'Pending'
        });
        await user.save();
        res.status(201).json({ msg: `${ngoName} has been registered and is pending verification.` });
    } catch (err) {
        console.error("Error in /register:", err.message);
        res.status(500).send('Server Error');
    }
});

/*
 * ROUTE: GET /api/ngo/all
 * PURPOSE: Fetches all NGO users regardless of their verification status.
 * This is the primary data source for the police management screen.
 */
router.get('/all', async (req, res) => {
    try {
        const ngoRole = await Role.findOne({ role_name: 'NGO' });
        if (!ngoRole) return res.status(404).json({ msg: 'NGO role not found' });

        const allNgos = await User.find({ role: ngoRole._id }).select('-password').sort({ name: 1 });
        res.json(allNgos);
    } catch (err) {
        console.error("Error in /all:", err.message);
        res.status(500).send('Server Error');
    }
});

/*
 * ROUTE: PUT /api/ngo/update-status/:id (UPDATED: Handles 'Approved', 'Rejected', 'Frozen')
 * PURPOSE: For police to change an NGO's status and send a notification.
 */
router.put('/update-status/:id', async (req, res) => {
  const { status } = req.body; // Expects "Approved", "Rejected", or "Frozen"
  if (!['Approved', 'Rejected', 'Frozen'].includes(status)) {
    return res.status(400).json({ msg: 'Invalid status provided.' });
  }
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'NGO user not found' });

    user.status = status; // Update the user's status
    await user.save();

    // --- Create Notification for the NGO ---
    let notificationMessage = '';
    if (status === 'Approved') {
      notificationMessage = `Congratulations, ${user.name}! Your account has been verified. You can now log in and access all features.`;
    } else if (status === 'Rejected') {
      notificationMessage = `We regret to inform you that your registration for ${user.name} has been rejected. Please contact support.`;
    } else if (status === 'Frozen') {
      notificationMessage = `Attention, ${user.name}! Your NGO account has been temporarily frozen due to reported malpractices. Please contact support immediately.`;
    }

    if (notificationMessage) {
      const newNotification = new Notification({ recipient: user._id, message: notificationMessage });
      await newNotification.save();
    }

    res.json({ msg: `NGO has been successfully ${status.toLowerCase()}.` });
  } catch (err) {
    console.error("Error in /update-status:", err.message);
    res.status(500).send('Server Error');
  }
});

// --- PERSONALIZED NGO DASHBOARD STATISTICS ROUTE ---
/**
 * @route   GET /api/ngo/dashboard-stats
 * @desc    Get daily statistics for THE LOGGED-IN NGO (simplified for dashboard use)
 * @access  PRIVATE
 */
router.get('/dashboard-stats', authMiddleware, async (req, res) => {
    try {
        const loggedInNgoId = new mongoose.Types.ObjectId(req.user.id);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // --- DEFINE THE DATABASE QUERIES ---

        // 1. Photos Reviewed Today (Counts 'Verified' OR 'Rejected' actions today)
        const photosReviewedTodayPromise = MissingReport.countDocuments({
            reviewedByNgo: loggedInNgoId,
            reviewedAt: { $gte: today },
            
        });

        // 2. AI Matches Checked (Counts reports this NGO marked as 'Found')
        const aiMatchesCheckedPromise = MissingReport.countDocuments({
            foundByNgo: loggedInNgoId,
            status: 'Found',
        });

        // =========================================================================
        // ===          THIS IS THE MODIFIED LOGIC FOR YOUR COUNTER              ===
        // =========================================================================
        // 3. Total Verified Reports (The new "Reports Sent to Police" metric)
        // This is a TOTAL count of all reports ever verified by this NGO.
        // It is NOT limited by today's date.
        const totalVerifiedReportsPromise = MissingReport.countDocuments({
            reviewedByNgo: loggedInNgoId,
            status: 'Verified', // We now count reports with the "Verified" status
        });
        // =========================================================================

        // Run all queries in parallel for maximum performance
        const [
            photosReviewedToday,
            aiMatchesChecked,
            totalVerifiedReports, // Use the new variable name
        ] = await Promise.all([
            photosReviewedTodayPromise,
            aiMatchesCheckedPromise,
            totalVerifiedReportsPromise,
        ]);
        
        // Send the updated stats object to the frontend
        res.json({
            photosReviewedToday,
            aiMatchesChecked,
            reportsSentToPolice: totalVerifiedReports, // Keep the key for now to avoid breaking the frontend initially
        });

    } catch (error) {
        console.error('Error in NGO dashboard stats:', error.message);
        res.status(500).json({ msg: 'Server error while calculating stats.' });
    }
});


module.exports = router;