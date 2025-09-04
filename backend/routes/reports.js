// backend/routes/reports.js

const express = require('express');
const router = express.Router();
const multer = require('multer'); // ADD THIS LINE
const path = require('path');   // ADD THIS LINE
const fs = require('fs');       // ADD THIS LINE
const { MissingReport, Role, User } = require('../models'); 

// --- MULTER CONFIGURATION FOR IMAGE UPLOADS ---
// This tells multer where to save the files and what to name them.
const reportUploadsDir = path.join(__dirname, '..', 'uploads', 'reports');
if (!fs.existsSync(reportUploadsDir)) {
    fs.mkdirSync(reportUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, reportUploadsDir);
    },
    filename: function (req, file, cb) {
        // Create a unique filename to prevent files with the same name from overwriting each other
        cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'));
    }
});

const upload = multer({ storage: storage });
// --- END OF MULTER CONFIGURATION ---


// @route   POST api/reports
// @desc    Submit a new missing person report with an image
// --- THIS IS THE CRITICAL CHANGE: We add `upload.single('photo')` middleware ---
router.post('/', upload.single('photo'), async (req, res) => {
    // With multer, text fields from FormData are in req.body
    const { user, person_name, gender, age, last_seen, description, relationToReporter, reporterContact } = req.body;
    
    // The uploaded file information is now in `req.file`
    if (!req.file) {
        return res.status(400).json({ msg: 'Photo is required.' });
    }

    if (!user || !person_name || !gender || !age || !last_seen) {
        return res.status(400).json({ msg: 'Please provide all required text fields.' });
    }
    try {
        // Construct the publicly accessible URL path for the saved image
        const photo_url = `uploads/reports/${req.file.filename}`;

        const newReport = new MissingReport({
            user, person_name, gender, age, last_seen,
            description, relationToReporter, reporterContact,
            photo_url: photo_url, // Save the actual file path
            status: 'Pending Verification',
        });
        await newReport.save();
        res.status(201).json({ msg: 'Report submitted successfully', report: newReport });
    } catch (err) {
        console.error('Error submitting report:', err.message);
        res.status(500).json({ 
            msg: 'A server error occurred while saving the report.',
            error: err.message
        });
    }
});


// Other GET routes remain unchanged
router.get('/', async (req, res) => {
    try {
        const reports = await MissingReport.find().populate('user', 'name email').sort({ reported_at: -1 });
        res.json(reports);
    } catch (err) {
        console.error('Error fetching all reports:', err.message);
        res.status(500).send('Server Error');
    }
});
router.get('/family', async (req, res) => {
    try {
        const familyRole = await Role.findOne({ role_name: 'Family' });
        if (!familyRole) return res.status(404).json({ msg: 'Family role not found in database.' });
        const familyUsers = await User.find({ role: familyRole._id }).select('_id');
        const familyUserIds = familyUsers.map(u => u._id);
        const reports = await MissingReport.find({ user: { $in: familyUserIds } }).populate('user', 'name email').sort({ reported_at: -1 });
        res.json(reports);
    } catch (err) {
        console.error('Error fetching family reports:', err.message);
        res.status(500).send('Server Error');
    }
});
router.get('/:id', async (req, res) => {
    try {
        const report = await MissingReport.findById(req.params.id).populate('user', 'name email');
        if (!report) return res.status(404).json({ msg: 'Report not found' });
        res.json(report);
    } catch (err) {
        console.error(`Error fetching report by ID:`, err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ msg: 'Report not found' });
        res.status(500).send('Server Error');
    }
});

module.exports = router;