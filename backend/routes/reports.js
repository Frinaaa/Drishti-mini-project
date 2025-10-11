const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { MissingReport, Role, User, Notification } = require('../models');

// --- MULTER CONFIGURATION FOR IMAGE UPLOADS ---
const reportUploadsDir = path.join(__dirname, '..', 'uploads', 'reports');
if (!fs.existsSync(reportUploadsDir))  {
    fs.mkdirSync(reportUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, reportUploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        let extension = '.jpg';
        if (file.mimetype === 'image/png') {
            extension = '.png';
        }
        cb(null, uniqueSuffix + extension);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
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

        console.log('✅ Multer saved file info:', req.file);

        const { user, person_name, gender, age, last_seen, description, relationToReporter, reporterContact, familyEmail, pinCode } = req.body;
        
        console.log('[POST /api/reports] Received body:', req.body);

        if (!req.file) {
            return res.status(400).json({ msg: 'A photo of the missing person is required.' });
        }
        if (!user || !person_name || !gender || !age || !last_seen || !relationToReporter || !reporterContact || !pinCode) {
            return res.status(400).json({ msg: 'Please provide all required text fields, including the PIN code.' });
        }

        try {
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

// --- NEW ENDPOINT TO SUPPORT FACE SEARCH ---
// @route   GET /api/reports/by-filename/:filename
// @desc    Get a single report by its associated photo filename
router.get('/by-filename/:filename', async (req, res) => {
    try {
        // Use a regex to find a report where the photo_url contains the filename
        const report = await MissingReport.findOne({ 
            photo_url: { $regex: req.params.filename, $options: 'i' } 
        }).populate('user', 'name email'); // Populate the user who reported it

        if (!report) {
            return res.status(404).json({ msg: 'Report not found for this image filename.' });
        }
        res.json(report);
    } catch (err) {
        console.error('🔴 Server Error (fetching report by filename):', err.message);
        res.status(500).send('Server Error');
    }
});

// --- UPDATE STATUS ROUTES (VERIFY / REJECT / FOUND) ---

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

// @route   PUT /api/reports/found/:id
// @desc    Mark a report as 'Found' and notify stakeholders
router.put('/found/:id', async (req, res) => {
    try {
        const report = await MissingReport.findById(req.params.id).populate('user', 'name email');
        if (!report) { return res.status(404).json({ msg: 'Report not found.' }); }

        // Update the status to 'Found'
        report.status = 'Found';
        await report.save();
        
        const successMessage = `Wonderful news! ${report.person_name} has been found. The report status is updated and notifications are being sent.`;

        // Send notifications
        if (report.familyEmail) {
            const mailOptions = { 
                from: process.env.EMAIL_USER, 
                to: report.familyEmail, 
                subject: `Wonderful News: ${report.person_name} has been Found!`, 
                text: `Dear Family Member,\n\nWe are overjoyed to inform you that ${report.person_name} has been found.\n\nThis report, submitted by NGO "${report.user.name}", is now marked as 'Found'. Thank you for using our platform.` 
            };
            await transporter.sendMail(mailOptions);
            console.log(`Email notification sent to ${report.familyEmail} for found person.`);
        } else {
            const inAppMessage = `Wonderful News! The missing person from your report, "${report.person_name}", has been found.`;
            const newNotification = new Notification({ recipient: report.user._id, message: inAppMessage });
            await newNotification.save();
            console.log(`In-app notification sent to user ${report.user._id} for found person.`);
        }
        
        res.json({ msg: successMessage, report });
    } catch (err) {
        console.error("🔴 [Backend Error] /api/reports/found:", err);
        res.status(500).json({ msg: 'Server error while updating report status to found.', error: err.message });
    }
});

module.exports = router;