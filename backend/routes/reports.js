// backend/routes/reports.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
// --- IMPORTANT: Make sure User model is imported ---
const { MissingReport, Notification, User } = require("../models");

// --- 1. MIDDLEWARE & CONFIGURATION ---

const reportUploadsDir = path.join(process.cwd(), "backend", "uploads", "reports");
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

// --- 2. REPORT SUBMISSION ROUTE (With Family Linking) ---

router.post("/", (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ msg: `File upload error: ${err.message}` });
    }
    const requiredFields = ["user", "person_name", "gender", "age", "last_seen", "relationToReporter", "reporterContact", "pinCode"];
    for (const field of requiredFields) {
      if (!req.body[field]) { return res.status(400).json({ msg: `Missing required field: ${field}` }); }
    }
    if (!req.file) {
      return res.status(400).json({ msg: "A photo of the missing person is required." });
    }

    try {
      const { user, person_name, gender, age, last_seen, description, relationToReporter, reporterContact, familyEmail, pinCode } = req.body;
      const newReportData = { user, person_name, gender, age, last_seen, description, relationToReporter, reporterContact, familyEmail, pinCode, photo_url: `uploads/reports/${req.file.filename}`, status: "Pending Verification", associatedFamily: null };

      if (familyEmail) {
        const familyUser = await User.findOne({ email: familyEmail });
        if (familyUser) {
          newReportData.associatedFamily = familyUser._id;
          console.log(`[Link] Report linked to family account ID: ${familyUser._id}`);
        }
      }

      const newReport = new MissingReport(newReportData);
      await newReport.save();

      if (familyEmail) {
        await transporter.sendMail({ from: process.env.EMAIL_USER, to: familyEmail, subject: "Missing Person Report Submitted", text: `Dear Family Member,\n\nYour report for ${person_name} has been submitted and is now under verification.` });
      }
      res.status(201).json({ msg: "Report submitted successfully", report: newReport });
    } catch (dbErr) {
      res.status(500).json({ msg: "Server error while saving the report." });
    }
  });
});

// --- 3. REPORT RETRIEVAL ROUTES (Correct Order) ---

router.get("/", async (req, res) => {
  try {
    const { pinCode, limit } = req.query;
    let query = MissingReport.find(pinCode ? { pinCode } : {});
    query = query.populate("user", "name email").sort({ reported_at: -1 });
    if (limit && !isNaN(parseInt(limit))) {
      query = query.limit(parseInt(limit));
    }
    const reports = await query.exec();
    res.json(reports);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// --- FIX: Specific routes MUST come before general routes like /:id ---

router.get("/recent", async (req, res) => {
  try {
    const recentReports = await MissingReport.find({ status: "Pending Verification" }).sort({ reported_at: -1 }).limit(5);
    res.json(recentReports);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

router.get("/verified-filenames", async (req, res) => {
  try {
    const verifiedReports = await MissingReport.find({ status: "Verified" }, "photo_url").lean();
    const filenames = verifiedReports.reduce((acc, report) => { if (report?.photo_url) acc.push(path.basename(report.photo_url)); return acc; }, []);
    res.json(filenames);
  } catch (err) {
    res.status(500).json({ msg: "Server error while fetching verified filenames." });
  }
});

router.get("/by-filename/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const report = await MissingReport.findOne({ photo_url: { $regex: `${filename}$` } }).populate("user", "name email");
    if (!report) { return res.status(404).json({ msg: "Report not found for this image." }); }
    res.json(report);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

router.get("/user/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId.match(/^[0-9a-fA-F]{24}$/)) { return res.status(400).json({ msg: "Invalid User ID format." }); }
        const reports = await MissingReport.find({ $or: [{ user: userId }, { associatedFamily: userId }] }).sort({ reported_at: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// This general route is now correctly placed last
router.get("/:id", async (req, res) => {
  try {
    const report = await MissingReport.findById(req.params.id).populate("user", "name email");
    if (!report) { return res.status(404).json({ msg: "Report not found" }); }
    res.json(report);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// --- 4. STATUS UPDATE LOGIC (With Family Notification) ---

async function updateReportStatus(req, res, newStatus) {
  try {
    const report = await MissingReport.findById(req.params.id).populate("user", "name email");
    if (!report) { return res.status(404).json({ msg: "Report not found." }); }

    const allowedPreviousStatuses = ['Pending Verification', 'Verified'];
    if (!allowedPreviousStatuses.includes(report.status) && newStatus !== 'Found') {
      return res.status(400).json({ msg: `Report has already been actioned. Current status: ${report.status}` });
    }

    report.status = newStatus;
    if (newStatus === 'Found' && req.body.source) {
        if (['Police Face Search', 'NGO Live Scan'].includes(req.body.source)) {
            report.source = req.body.source;
        }
    }
    await report.save();

    let subject = "", text = "", inAppMessage = "";
    switch (newStatus) {
      case "Verified": subject = `Update on Report for ${report.person_name}`; text = `Status: VERIFIED\nYour report for ${report.person_name} has been verified.`; inAppMessage = `Your report for "${report.person_name}" has been verified.`; break;
      case "Rejected": subject = `Update on Report for ${report.person_name}`; text = `Status: REJECTED\nYour report for ${report.person_name} has been rejected.`; inAppMessage = `Your report for "${report.person_name}" has been rejected.`; break;
      case "Found": subject = `Wonderful News: ${report.person_name} has been Found!`; text = `We are overjoyed to inform you that ${report.person_name} has been found.`; inAppMessage = `Wonderful News! "${report.person_name}" has been found.`; break;
    }

    if (report.familyEmail) { await transporter.sendMail({ from: process.env.EMAIL_USER, to: report.familyEmail, subject, text }); }
    if (report.user) { await new Notification({ recipient: report.user._id, message: inAppMessage }).save(); }
    if (report.associatedFamily && report.associatedFamily.toString() !== report.user._id.toString()) {
        await new Notification({ recipient: report.associatedFamily, message: inAppMessage }).save();
    }

    res.json({ msg: `Report status updated to '${newStatus}'. Notifications sent.` });
  } catch (err) {
    res.status(500).json({ msg: `Server error during status update.`, error: err.message });
  }
}

router.put("/verify/:id", (req, res) => updateReportStatus(req, res, "Verified"));
router.put("/reject/:id", (req, res) => updateReportStatus(req, res, "Rejected"));
router.put("/found/:id", (req, res) => updateReportStatus(req, res, "Found"));

module.exports = router;