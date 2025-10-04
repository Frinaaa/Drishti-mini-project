const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { MissingReport, Role, User, Notification } = require('../models');

// --- MULTER CONFIGURATION FOR IMAGE UPLOADS ---
const reportUploadsDir = path.join(__dirname, '..', 'uploads', 'reports');
if (!fs.existsSync(reportUploadsDir)) {
    fs.mkdirSync(reportUploadsDir, { recursive: true });
}

// This storage engine ensures that every uploaded image is saved with a
// unique name AND the correct file extension (.jpg or .png).
// This is critical for the Python AI server to be able to find and process the images.
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, reportUploadsDir);
    },
    // --- START OF THE FIX ---
    filename: function (req, file, cb) {
        // Create a new, unique, and safe filename.
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        
        // Determine the correct file extension from the file's mimetype.
        let extension = '.jpg'; // Default to .jpg
        if (file.mimetype === 'image/png') {
            extension = '.png';
        }
        
        // Combine the unique name and the correct extension.
        // Example result: '1678886400000-123456789.jpg'
        cb(null, uniqueSuffix + extension);
    }
    // --- END OF THE FIX ---
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter: (req, file, cb) => {
        // This filter remains the same, it correctly checks the mimetype.
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type, only JPEG, JPG and PNG are allowed!'), false);
        }
    }
}).single('photo');

// --- NODEMAILER TRANSPORTER SETUP ---
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// @route   POST /api/reports
// @desc    Submit a new missing person report
router.post('/', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error('🔴 Multer Error:', err.message);
            return res.status(400).json({ msg: `File upload error: ${err.message}` });
        }

        // --- HELPFUL DEBUG LOG ---
        // This will show you exactly what file multer saved to the disk.
        // Check your terminal to confirm the filename has a .jpg or .png extension!
        console.log('✅ Multer saved file info:', req.file);
        // --- END OF LOG ---

        const { user, person_name, gender, age, last_seen, description, relationToReporter, reporterContact, familyEmail, pinCode } = req.body;
        
        console.log('[POST /api/reports] Received body:', req.body);

        if (!req.file) {
            return res.status(400).json({ msg: 'A photo of the missing person is required.' });
        }
        if (!user || !person_name || !gender || !age || !last_seen || !relationToReporter || !reporterContact || !pinCode) {
            return res.status(400).json({ msg: 'Please provide all required text fields, including the PIN code.' });
        }

        try {
            // The photo_url now correctly points to the file saved by multer.
            const photo_url = `uploads/reports/${req.file.filename}`;
            const newReportData = { user, person_name, gender, age, last_seen, description, relationToReporter, reporterContact, photo_url, status: 'Pending Verification', pinCode };

            if (familyEmail) {
                newReportData.familyEmail = familyEmail;
            }

            const newReport = new MissingReport(newReportData);
            await newReport.save();
            console.log(`✅ Report submitted successfully with PIN Code: ${pinCode}`);

            if (familyEmail) {
                const mailOptions = { from: process.env.EMAIL_USER, to: familyEmail, subject: 'Missing Person Report Submitted', text: `Dear Family Member,\n\nYour report for ${person_name} has been submitted by an NGO and is now under verification.` };
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) console.error('Error sending initial submission email:', error);
                    else console.log('Initial submission email sent:', info.response);
                });
            }

            res.status(201).json({ msg: 'Report submitted successfully', report: newReport });
        } catch (dbErr) {
            console.error('🔴 Database Error (saving report):', dbErr.message);
            res.status(500).json({ msg: 'A server error occurred while saving the report.' });
        }
    });
});

// --- GET ROUTES ---

// @route   GET /api/reports
// @desc    Get reports, filtered by pinCode if provided
router.get('/', async (req, res) => {
    try {
        const { pinCode } = req.query;
        console.log(`[GET /api/reports] Received request with pinCode query: ${pinCode || 'None'}`);
        let queryFilter = {};
        if (pinCode) {
            queryFilter.pinCode = pinCode;
        }
        const reports = await MissingReport.find(queryFilter)
            .populate('user', 'name email')
            .sort({ reported_at: -1 });
            
        console.log(`[GET /api/reports] Found ${reports.length} reports for this query.`);
        res.json(reports);
    } catch (err) {
        console.error('🔴 Server Error (fetching reports):', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/reports/:id
router.get('/:id', async (req, res) => {
    try {
        const report = await MissingReport.findById(req.params.id).populate('user', 'name email');
        if (!report) return res.status(404).json({ msg: 'Report not found' });
        res.json(report);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- UPDATE STATUS ROUTES (VERIFY / REJECT) ---

// @route   PUT /api/reports/verify/:id
router.put('/verify/:id', async (req, res) => {
    try {
        const report = await MissingReport.findById(req.params.id).populate('user', 'name email');
        if (!report) { return res.status(404).json({ msg: 'Report not found.' }); }

        if (report.familyEmail) {
            const mailOptions = { from: process.env.EMAIL_USER, to: report.familyEmail, subject: `Update on Report for ${report.person_name}`, text: `Dear Family Member,\n\nStatus: VERIFIED\n\nYour report for ${report.person_name}, submitted by NGO "${report.user.name}", has been successfully verified.` };
            await transporter.sendMail(mailOptions);
        } else {
            const inAppMessage = `Good news! Your report for "${report.person_name}" has been verified.`;
            const newNotification = new Notification({ recipient: report.user._id, message: inAppMessage });
            await newNotification.save();
        }

        report.status = 'Verified';
        await report.save();
        
        res.json({ msg: 'Report verified. Notifications have been sent.' });
    } catch (err) {
        console.error("🔴 [Backend Error] /api/reports/verify:", err);
        res.status(500).json({ msg: 'Server error during verification.', error: err.message });
    }
});


// @route   PUT /api/reports/reject/:id
router.put('/reject/:id', async (req, res) => {
    try {
        const report = await MissingReport.findById(req.params.id).populate('user', 'name email');
        if (!report) { return res.status(404).json({ msg: 'Report not found.' }); }
        
        if (report.familyEmail) {
            const mailOptions = { from: process.env.EMAIL_USER, to: report.familyEmail, subject: `Update on Report for ${report.person_name}`, text: `Dear Family Member,\n\nStatus: REJECTED\n\nYour report for ${report.person_name}, submitted by NGO "${report.user.name}", has been rejected.` };
            await transporter.sendMail(mailOptions);
        } else {
            const inAppMessage = `Update: Your report for "${report.person_name}" has been rejected.`;
            const newNotification = new Notification({ recipient: report.user._id, message: inAppMessage });
            await newNotification.save();
        }

        report.status = 'Rejected';
        await report.save();
        
        res.json({ msg: 'Report rejected. Notifications have been sent.' });
    } catch (err) {
        console.error("🔴 [Backend Error] /api/reports/reject:", err);
        res.status(500).json({ msg: 'Server error during rejection.', error: err.message });
    }
});

module.exports = router;