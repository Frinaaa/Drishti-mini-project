// backend/routes/reports.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const { MissingReport, Notification } = require("../models");

/*
 * ===================================================================
 * DATABASE PERFORMANCE RECOMMENDATION:
 * For optimal performance, ensure the following fields in the 'missingreports'
 * collection are indexed in your MongoDB database:
 * - status
 * - pinCode
 * - photo_url
 * ===================================================================
 */

// --- 1. MIDDLEWARE & CONFIGURATION ---

const reportUploadsDir = path.join(
  process.cwd(),
  "backend",
  "uploads",
  "reports"
);
if (!fs.existsSync(reportUploadsDir)) {
  fs.mkdirSync(reportUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, reportUploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("File is not an image!"), false);
    }
    cb(null, true);
  },
}).single("photo");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// --- 2. REPORT SUBMISSION ROUTE ---

/**
 * @route   POST /api/reports
 * @desc    Submit a new missing person report with a photo
 */
router.post("/", (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("🔴 [Multer Error]", err.message);
      return res.status(400).json({ msg: `File upload error: ${err.message}` });
    }

    const requiredFields = [ "user", "person_name", "gender", "age", "last_seen", "relationToReporter", "reporterContact", "pinCode" ];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ msg: `Missing required field: ${field}` });
      }
    }
    if (!req.file) {
      return res.status(400).json({ msg: "A photo of the missing person is required." });
    }

    try {
      const { user, person_name, gender, age, last_seen, description, relationToReporter, reporterContact, familyEmail, pinCode } = req.body;

      const newReport = new MissingReport({
        user, person_name, gender, age, last_seen, description, relationToReporter, reporterContact, familyEmail, pinCode,
        photo_url: `uploads/reports/${req.file.filename}`,
        status: "Pending Verification",
      });

      await newReport.save();
      console.log(`✅ [Report Created] Report for '${person_name}' saved successfully.`);

      if (familyEmail) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: familyEmail,
          subject: "Missing Person Report Submitted",
          text: `Dear Family Member,\n\nYour report for ${person_name} has been submitted and is now under verification.`,
        });
        console.log(`[Email Sent] Submission confirmation sent to ${familyEmail}.`);
      }

      res.status(201).json({ msg: "Report submitted successfully", report: newReport });
    } catch (dbErr) {
      console.error("🔴 [DB Error] Failed to save report:", dbErr);
      res.status(500).json({ msg: "Server error while saving the report." });
    }
  });
});

// --- 3. REPORT RETRIEVAL ROUTES ---

/**
 * @route   GET /api/reports
 * @desc    Get reports, optionally filtered by pinCode
 */
router.get("/", async (req, res) => {
  try {
    const { pinCode } = req.query;
    const query = pinCode ? { pinCode } : {};
    const reports = await MissingReport.find(query)
      .populate("user", "name email")
      .sort({ reported_at: -1 });
    res.json(reports);
  } catch (err) {
    console.error("🔴 [DB Error] Failed to fetch reports:", err);
    res.status(500).send("Server Error");
  }
});


// --- THIS IS THE CRITICAL FIX: ROUTE REORDERING ---
// The specific, non-parameterized routes are now defined BEFORE the general, parameterized routes.

/**
 * @route   GET /api/reports/verified-filenames
 * @desc    Get a list of photo filenames for all 'Verified' reports.
 */
router.get("/verified-filenames", async (req, res) => {
    try {
      const verifiedReports = await MissingReport.find(
        { status: "Verified" },
        "photo_url"
      ).lean();
  
      const filenames = verifiedReports.reduce((accumulator, report) => {
        if (report && typeof report.photo_url === "string" && report.photo_url.trim()) {
          try {
            const filename = path.basename(report.photo_url);
            accumulator.push(filename);
          } catch (pathError) {
            console.error(`🔴 [Path Error] Could not parse photo_url '${report.photo_url}' for report ID ${report._id}:`, pathError);
          }
        }
        return accumulator;
      }, []);
  
      console.log(`[INFO] /verified-filenames: Found ${filenames.length} verified image filenames.`);
      res.json(filenames);
    } catch (err) {
      console.error("🔴 [CRITICAL DB ERROR] /api/reports/verified-filenames:", err);
      res.status(500).json({ msg: "Server error while fetching verified filenames." });
    }
});

/**
 * @route   GET /api/reports/by-filename/:filename
 * @desc    Get a single report by its photo filename (for AI server)
 */
router.get("/by-filename/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const report = await MissingReport.findOne({ photo_url: { $regex: `${filename}$` } }).populate("user", "name email");
  
      if (!report) {
        return res.status(404).json({ msg: "Report not found for this image." });
      }
      res.json(report);
    } catch (err) {
      console.error(`🔴 [DB Error] Failed to fetch report by filename:`, err);
      res.status(500).send("Server Error");
    }
});

// This general route MUST come last.
/**
 * @route   GET /api/reports/:id
 * @desc    Get a single report by its ID
 */
router.get("/:id", async (req, res) => {
    try {
      const report = await MissingReport.findById(req.params.id).populate("user", "name email");
      if (!report) {
        return res.status(404).json({ msg: "Report not found" });
      }
      res.json(report);
    } catch (err) {
      console.error(`🔴 [DB Error] Failed to fetch report ${req.params.id}:`, err);
      res.status(500).send("Server Error");
    }
});

// --- END OF FIX ---


// --- 4. STATUS UPDATE LOGIC ---

/**
 * @helper  updateReportStatus
 * @desc    A generic helper to update report status and send notifications.
 */
async function updateReportStatus(req, res, newStatus) {
  try {
    const report = await MissingReport.findById(req.params.id).populate("user", "name email");
    if (!report) {
      return res.status(404).json({ msg: "Report not found." });
    }

    if (report.status !== "Pending Verification" && newStatus !== "Found") {
        return res.status(400).json({ msg: `Report has already been actioned. Current status: ${report.status}` });
    }

    report.status = newStatus;
    await report.save();

    let subject = "", text = "", inAppMessage = "";

    switch (newStatus) {
      case "Verified":
        subject = `Update on Report for ${report.person_name}`;
        text = `Status: VERIFIED\n\nYour report for ${report.person_name} has been successfully verified.`;
        inAppMessage = `Good news! Your report for "${report.person_name}" has been verified.`;
        break;
      case "Rejected":
        subject = `Update on Report for ${report.person_name}`;
        text = `Status: REJECTED\n\nYour report for ${report.person_name} has been rejected. Please check the details and resubmit if necessary.`;
        inAppMessage = `Update: Your report for "${report.person_name}" has been rejected.`;
        break;
      case "Found":
        subject = `Wonderful News: ${report.person_name} has been Found!`;
        text = `We are overjoyed to inform you that ${report.person_name} has been found. This case is now closed.`;
        inAppMessage = `Wonderful News! The missing person from your report, "${report.person_name}", has been found.`;
        break;
    }

    if (report.familyEmail) {
      await transporter.sendMail({ from: process.env.EMAIL_USER, to: report.familyEmail, subject, text });
      console.log(`[Email Sent] Status update ('${newStatus}') sent to ${report.familyEmail}.`);
    } else if (report.user) {
      await new Notification({ recipient: report.user._id, message: inAppMessage }).save();
      console.log(`[In-App Notification] Status update ('${newStatus}') sent to user ${report.user._id}.`);
    }

    res.json({ msg: `Report status updated to '${newStatus}'. Notifications sent.` });
  } catch (err) {
    console.error(`🔴 [Server Error] Failed to update status to '${newStatus}':`, err);
    res.status(500).json({ msg: `Server error during status update.`, error: err.message });
  }
}

router.put('/verify/:id', (req, res) => updateReportStatus(req, res, 'Verified'));
router.put('/reject/:id', (req, res) => updateReportStatus(req, res, 'Rejected'));
router.put('/found/:id', (req, res) => updateReportStatus(req, res, 'Found'));


module.exports = router;