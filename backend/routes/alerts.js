// backend/routes/alerts.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Assuming your auth middleware is in ../middleware/auth
const { MissingReport } = require('../models');

/**
 * @route   GET /api/alerts
 * @desc    Get recent missing person reports for police (last 24 hours)
 * @access  Private (Police only)
 */
router.get('/', auth, async (req, res) => {
    // This route requires an authenticated user.
    // We can add role-based access control here if needed,
    // but the status filter effectively limits it to the police workflow.

    try {
        // 1. Calculate the date and time for 24 hours ago from now.
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // 2. Find reports that meet both criteria:
        //    - Status is 'Pending Police Verification' (meaning an NGO has approved it).
        //    - `reported_at` timestamp is greater than or equal to 24 hours ago.
        const recentAlerts = await MissingReport.find({
            status: 'Pending Police Verification',
            reported_at: { $gte: twentyFourHoursAgo }
        })
        .populate('user', 'name') // Populate the NGO's name who forwarded the report
        .sort({ reported_at: -1 }); // Show the most recent reports first

        // 3. Send the found reports as a JSON response.
        res.json(recentAlerts);

    } catch (err) {
        console.error('Error fetching recent alerts:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;