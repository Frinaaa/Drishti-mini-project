// backend/routes/reports.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { MissingReport, Role, User,Notification } = require('../models');

// --- MULTER CONFIGURATION FOR IMAGE UPLOADS ---
const reportUploadsDir = path.join(__dirname, '..', 'uploads', 'reports');
if (!fs.existsSync(reportUploadsDir)) {
    fs.mkdirSync(reportUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, reportUploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'));
    }
});

// Configure Multer to handle potential errors and filter file types
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB (adjust as needed)
    fileFilter: (req, file, cb) => {
        // Log the file MIME type to debug
        console.log(`[Multer] Received file MIME type: ${file.mimetype}`);
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
            cb(null, true); // Accept file
        } else {
            cb(new Error('Invalid file type, only JPEG, JPG and PNG are allowed!'), false); // Reject file
        }
    }
}).single('photo'); // Expect a single file with field name 'photo'


// @route   POST api/reports
// @desc    Submit a new missing person report with an image
router.post('/', (req, res) => {
    // Wrap the Multer upload process in this route to catch Multer-specific errors
    upload(req, res, async (err) => {
        // --- Multer Error Handling ---
        if (err instanceof multer.MulterError) {
            console.error('🔴 Multer Error (Type: MulterError):', err.message);
            console.error('Details:', err); // Log the full error object
            return res.status(400).json({ msg: `File upload error: ${err.message}` });
        } else if (err) {
            console.error('🔴 Multer Error (Unknown/FileFilter Error):', err.message);
            console.error('Details:', err); // Log the full error object
            return res.status(400).json({ msg: `Upload error: ${err.message}` });
        }

        // --- Post-Multer Processing & Validation ---
        console.log(`[Backend] Request received for /api/reports`);
        console.log(`[Backend] req.body:`, req.body);
        console.log(`[Backend] req.file:`, req.file);

        const { user, person_name, gender, age, last_seen, description, relationToReporter, reporterContact } = req.body;
        
        if (!req.file) {
            console.error('🔴 Validation Error: Photo is missing from the request.');
            return res.status(400).json({ msg: 'Photo is required.' });
        }

        // Backend validation for text fields - make sure they are ALL present
        if (!user || !person_name || !gender || !age || !last_seen || !relationToReporter || !reporterContact) {
            console.error('🔴 Validation Error: Missing required text fields.');
            console.error('Received fields:', { user, person_name, gender, age, last_seen, description, relationToReporter, reporterContact });
            return res.status(400).json({ msg: 'Please provide all required text fields.' });
        }

        try {
            const photo_url = `uploads/reports/${req.file.filename}`;

            const newReport = new MissingReport({
                user, person_name, gender, age, last_seen,
                description, relationToReporter, reporterContact,
                photo_url: photo_url,
                status: 'Pending Verification',
            });
            await newReport.save();
            console.log('✅ Report submitted successfully for:', person_name);
            res.status(201).json({ msg: 'Report submitted successfully', report: newReport });
        } catch (dbErr) {
            console.error('🔴 Database Error (saving report):', dbErr.message);
            res.status(500).json({ 
                msg: 'A server error occurred while saving the report.',
                error: dbErr.message
            });
        }
    });
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
router.put('/verify/:id', async (req, res) => {
    try {
        const report = await MissingReport.findById(req.params.id);
        if (!report) { return res.status(404).json({ msg: 'Report not found.' }); }

        report.status = 'Verified';
        await report.save();

        const notificationMessage = `Good news! Your report for "${report.person_name}" has been verified by an NGO and is now active.`;
        const newNotification = new Notification({ recipient: report.user, message: notificationMessage });
        await newNotification.save();
        
        res.json({ msg: 'Report verified and notification sent to the family.' });
    } catch (err) {
        console.error("🔴 [Backend Error] /api/reports/verify:", err);
        res.status(500).send('Server Error');
    }
});

router.put('/reject/:id', async (req, res) => {
    try {
        const report = await MissingReport.findById(req.params.id);
        if (!report) { return res.status(404).json({ msg: 'Report not found.' }); }

        report.status = 'Rejected';
        await report.save();

        const notificationMessage = `Update: Your report for "${report.person_name}" has been reviewed and rejected. Please contact support for more information.`;
        const newNotification = new Notification({ recipient: report.user, message: notificationMessage });
        await newNotification.save();
        
        res.json({ msg: 'Report rejected and notification sent to the family.' });
    } catch (err) {
        console.error("🔴 [Backend Error] /api/reports/reject:", err);
        res.status(500).send('Server Error');
    }
});
module.exports = router;