const express = require('express');
const router = express.Router();
const { User, Role, Notification, MissingReport } = require('../models');
const authMiddleware = require('../middleware/auth');
const mongoose = require('mongoose');
// --- EXISTING NGO MANAGEMENT ROUTES (Please ensure your original code is here) ---
router.post('/register', async (req, res) => { /* ... your existing registration code ... */ });
router.get('/all', async (req, res) => { /* ... your existing code to get all NGOs ... */ });
router.put('/update-status/:id', async (req, res) => { /* ... your existing code to update status ... */ });


// --- PERSONALIZED NGO DASHBOARD STATISTICS ROUTE ---
/**
 * @route   GET /api/ngo/dashboard-stats
 * @desc    Get daily statistics for THE LOGGED-IN NGO.
 * @access  PRIVATE
 */
router.get('/dashboard-stats', authMiddleware, async (req, res) => {
    try {
        const loggedInNgoId = req.user.id;
        const ngoObjectId = new mongoose.Types.ObjectId(loggedInNgoId);

        // --- NEW, MORE ROBUST DATE LOGIC ---
        const today = new Date();
        // Set to the very beginning of today in the server's local timezone
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        // Set to the very end of today in the server's local timezone
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        
        // --- FINAL DETECTIVE LOG ---
        // Let's see the exact query and the date range we are using
        const queryForPhotosReviewed = {
            reviewedByNgo: ngoObjectId,
            reviewedAt: { $gte: startOfDay, $lt: endOfDay }
        };
        console.log("\n--- [DASHBOARD DEBUG] ---");
        console.log("Querying for NGO ID:", ngoObjectId.toString());
        console.log("Date Range (Start):", startOfDay.toISOString());
        console.log("Date Range (End):  ", endOfDay.toISOString());
        console.log("Full Query Object:", JSON.stringify(queryForPhotosReviewed, null, 2));
        console.log("-------------------------\n");
        // --- END OF LOG ---

        const [
            photosReviewedToday,
            aiMatchesChecked,
            reportsSent
        ] = await Promise.all([
            // Use the constructed query object
            MissingReport.countDocuments(queryForPhotosReviewed),
            
            MissingReport.countDocuments({
                foundByNgo: ngoObjectId,
                foundAt: { $gte: startOfDay, $lt: endOfDay }
            }),

            MissingReport.countDocuments({
                reviewedByNgo: ngoObjectId,
                status: "Verified",
                reviewedAt: { $gte: startOfDay, $lt: endOfDay }
            })
        ]);
        
        console.log("[INFO] Counts found:", { photosReviewedToday, aiMatchesChecked, reportsSent });
        res.json({ photosReviewedToday, aiMatchesChecked, reportsSent });

    } catch (error) {
        console.error('--- [CRITICAL ERROR] Server crashed in /dashboard-stats:', error);
        res.status(500).json({ msg: 'Server error while calculating stats.' });
    }
});
module.exports = router;