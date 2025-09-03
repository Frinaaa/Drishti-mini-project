const express = require('express');
const router = express.Router();
const { MissingReport, Role, User } = require('../models'); 

// @route   POST api/reports
// @desc    Submit a new missing person report
router.post('/', async (req, res) => {
    const { user, person_name, gender, age, last_seen, description, relationToReporter, reporterContact, photo_url } = req.body;

    if (!user || !person_name || !gender || !age || !last_seen) {
        return res.status(400).json({ msg: 'Please provide all required fields.' });
    }
    try {
        const newReport = new MissingReport({
            user, person_name, gender, age, last_seen,
            description, relationToReporter, reporterContact,
            photo_url: photo_url || 'default_photo_url_here',
            status: 'Pending Verification',
        });
        await newReport.save();
        res.status(201).json({ msg: 'Report submitted successfully', report: newReport });
    } catch (err) {
        console.error('Error submitting report:', err.message);
        res.status(500).send('Server Error');
    }
});

// --- START OF CHANGES (Backend) ---
// @route   GET api/reports
// @desc    Get all missing person reports (family and NGO)
router.get('/', async (req, res) => {
    try {
        const reports = await MissingReport.find()
            .populate('user', 'name email') // Populate user details for all reports
            .sort({ reported_at: -1 }); // Sort by newest first
        res.json(reports);
    } catch (err) {
        console.error('Error fetching all reports:', err.message);
        res.status(500).send('Server Error');
    }
});
// --- END OF CHANGES (Backend) ---

// @route   GET api/reports/family
// @desc    Get all reports submitted by family members
// KEEPING THIS ROUTE AS IS, it's still useful if you have a separate "Family dashboard"
router.get('/family', async (req, res) => {
    try {
        const familyRole = await Role.findOne({ role_name: 'Family' });
        if (!familyRole) {
            return res.status(404).json({ msg: 'Family role not found in database.' });
        }
        const familyUsers = await User.find({ role: familyRole._id }).select('_id');
        const familyUserIds = familyUsers.map(user => user._id);
        const reports = await MissingReport.find({ user: { $in: familyUserIds } })
            .populate('user', 'name email')
            .sort({ reported_at: -1 });
        res.json(reports);
    } catch (err) {
        console.error('Error fetching family reports:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/reports/:id
// @desc    Get a single report by its ID
router.get('/:id', async (req, res) => {
    try {
        const report = await MissingReport.findById(req.params.id).populate('user', 'name email');
        if (!report) {
            return res.status(404).json({ msg: 'Report not found' });
        }
        res.json(report);
    } catch (err) {
        console.error(`Error fetching report by ID:`, err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Report not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;