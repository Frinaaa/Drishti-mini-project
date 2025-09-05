// backend/routes/reports.js

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

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, reportUploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type, only JPEG, JPG and PNG are allowed!'), false);
        }
    }
}).single('photo'); // Expects a single file from a form field named 'photo'

// --- NODEMAILER TRANSPORTER SETUP ---
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // Your email from .env file
    pass: process.env.EMAIL_PASS, // Your email password or app password from .env file
  },
});

// @route   POST /api/reports
// @desc    Submit a new missing person report (handles both Family and NGO submissions)
router.post('/', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error('🔴 Multer Error:', err.message);
            return res.status(400).json({ msg: `File upload error: ${err.message}` });
        }

        const { user, person_name, gender, age, last_seen, description, relationToReporter, reporterContact, familyEmail } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ msg: 'A photo of the missing person is required.' });
        }
        if (!user || !person_name || !gender || !age || !last_seen || !relationToReporter || !reporterContact) {
            return res.status(400).json({ msg: 'Please provide all required text fields.' });
        }

        try {
            const photo_url = `uploads/reports/${req.file.filename}`;

            const newReportData = {
                user, person_name, gender, age, last_seen, description,
                relationToReporter, reporterContact, photo_url,
                status: 'Pending Verification',
            };

            // Only add the familyEmail field if it was provided (meaning an NGO submitted it)
            if (familyEmail) {
                newReportData.familyEmail = familyEmail;
            }

            const newReport = new MissingReport(newReportData);
            await newReport.save();
            console.log('✅ Report submitted successfully for:', person_name);

            // If an NGO submitted the report, send an initial email to the family
            if (familyEmail) {
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: familyEmail,
                    subject: 'Missing Person Report Submitted',
                    text: `Dear Family Member,\n\nYour report for ${person_name} has been submitted by an NGO and is now under verification.\n\nWe will notify you of any updates.\n\nBest regards,\nThe Drishti Team`
                };
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
// @desc    Get all reports
router.get('/', async (req, res) => {
    try {
        const reports = await MissingReport.find().populate('user', 'name email').sort({ reported_at: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/reports/:id
// @desc    Get a single report by its ID
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
// @desc    NGO verifies a report, triggering the correct notification
router.put('/verify/:id', async (req, res) => {
    try {
        const report = await MissingReport.findById(req.params.id).populate('user', 'name email');
        if (!report) { return res.status(404).json({ msg: 'Report not found.' }); }

        // --- CHANGE #1: Use async/await on transporter.sendMail ---
        // We will now wait for the email to be sent before continuing.
        if (report.familyEmail) {
            console.log(`[Email] Attempting to send verification email to: ${report.familyEmail}`);
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: report.familyEmail,
                subject: `Update on Report for ${report.person_name}`,
                text: `Dear Family Member,\n\nStatus: VERIFIED\n\nYour report for ${report.person_name}, submitted by NGO "${report.user.name}", has been successfully verified and is now active.`
            };
            
            // This `await` will pause execution here until the email sends or fails.
            let info = await transporter.sendMail(mailOptions);
            console.log('✅ Verification email sent successfully:', info.response);

        } else {
            // Send in-app notification for family-submitted reports
            const inAppMessage = `Good news! Your report for "${report.person_name}" has been verified.`;
            const newNotification = new Notification({ recipient: report.user._id, message: inAppMessage });
            await newNotification.save();
        }

        // Now that email/notification is sent, update and save the report
        report.status = 'Verified';
        await report.save();
        
        res.json({ msg: 'Report verified. Notifications have been sent.' });

    } catch (err) {
        // --- CHANGE #2: The catch block will now receive errors from sendMail ---
        console.error("🔴 [Backend Error] /api/reports/verify:", err);
        res.status(500).json({ msg: 'Server error during verification.', error: err.message });
    }
});


// --- THIS IS THE CORRECTED REJECT ROUTE ---
router.put('/reject/:id', async (req, res) => {
    try {
        const report = await MissingReport.findById(req.params.id).populate('user', 'name email');
        if (!report) { return res.status(404).json({ msg: 'Report not found.' }); }
        
        if (report.familyEmail) {
            console.log(`[Email] Attempting to send rejection email to: ${report.familyEmail}`);
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: report.familyEmail,
                subject: `Update on Report for ${report.person_name}`,
                text: `Dear Family Member,\n\nStatus: REJECTED\n\nYour report for ${report.person_name}, submitted by NGO "${report.user.name}", has been rejected.`
            };
            let info = await transporter.sendMail(mailOptions);
            console.log('✅ Rejection email sent successfully:', info.response);

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