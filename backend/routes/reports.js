// backend/routes/reports.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const { MissingReport, Notification, User } = require("../models"); // Ensure User is imported
const authMiddleware = require('../middleware/auth');
const auth = require('../middleware/auth'); 

// --- (All other code at the top of the file remains the same) ---
// ... multer setup, nodemailer setup, POST / route, GET / route, GET /recent route ...

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
    const MIME_TYPE_MAP = {
      'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg',
    };
    const extension = MIME_TYPE_MAP[file.mimetype] || '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${extension}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("File is not an image!"), false);
    }
    cb(null, true);
  },
}).single("photo");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", port: 587, secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

router.post("/", (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ msg: `File upload error: ${err.message}` });
    const requiredFields = ["user", "person_name", "gender", "age", "last_seen", "relationToReporter", "reporterContact", "pinCode"];
    for (const field of requiredFields) {
      if (!req.body[field]) return res.status(400).json({ msg: `Missing required field: ${field}` });
    }
    if (!req.file) return res.status(400).json({ msg: "A photo of the missing person is required." });
    try {
      const { user, person_name, gender, age, last_seen, description, relationToReporter, reporterContact, familyEmail, pinCode } = req.body;
      const newReport = new MissingReport({
        user, person_name, gender, age, last_seen, description, relationToReporter, reporterContact, familyEmail, pinCode,
        photo_url: `uploads/reports/${req.file.filename}`,
        status: "Pending Verification",
      });
      await newReport.save();
      if (familyEmail) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER, to: familyEmail,
          subject: "Missing Person Report Submitted",
          text: `Dear Family Member,\n\nYour report for ${person_name} has been submitted and is now under verification.`,
        });
      }
      res.status(201).json({ msg: "Report submitted successfully", report: newReport });
    } catch (dbErr) {
      console.error("DB Error saving report:", dbErr);
      res.status(500).json({ msg: "Server error while saving the report." });
    }
  });
});

router.get("/", async (req, res) => {
  try {
    const { pinCode } = req.query;
    const query = pinCode ? { pinCode } : {};
    const reports = await MissingReport.find(query).populate("user", "name email").sort({ reported_at: -1 });
    res.json(reports);
  } catch (err) {
    console.error("DB Error fetching reports:", err);
    res.status(500).send("Server Error");
  }
});

router.get("/recent", async (req, res) => {
  try {
    const recentReports = await MissingReport.find({ status: "Pending Verification" }).sort({ reported_at: -1 }).limit(2);
    res.json(recentReports);
  } catch (err) {
    console.error("DB Error fetching recent reports:", err);
    res.status(500).send("Server Error");
  }
});

router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const allUserReports = await MissingReport.find({ user: userId }).sort({ reported_at: -1 });
    res.status(200).json(allUserReports);
  } catch (err) {
    console.error(`Error fetching reports for user ${req.params.userId}:`, err);
    res.status(500).json({ msg: "Server error while fetching user reports." });
  }
});

router.get("/verified-filenames", async (req, res) => {
  try {
    const verifiedReports = await MissingReport.find({ status: "Verified" }, "photo_url").lean();
    const filenames = verifiedReports.reduce((accumulator, report) => {
      if (report && typeof report.photo_url === "string" && report.photo_url.trim()) {
        try {
          accumulator.push(path.basename(report.photo_url));
        } catch (pathError) {
          console.error(`Path Error for report ID ${report._id}:`, pathError);
        }
      }
      return accumulator;
    }, []);
    res.json(filenames);
  } catch (err) {
    console.error("DB Error /api/reports/verified-filenames:", err);
    res.status(500).json({ msg: "Server error while fetching verified filenames." });
  }
});

// =========================================================================
// === THIS IS THE CORRECTED ROUTE                                       ===
// =========================================================================
/**
 * @route   GET /api/reports/by-filename/:filename
 * @desc    Get a single report by its photo filename (for AI server and frontend)
 */
router.get("/by-filename/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({ msg: "Filename parameter is missing." });
    }
    
    // This query is robust. It finds a document where the `photo_url` field
    // ends with the provided filename. This works regardless of the full path stored.
    // e.g., it will match "uploads/reports/file.jpg" for a "file.jpg" parameter.
    const report = await MissingReport.findOne({
      photo_url: { $regex: `${filename}$` },
    }).populate("user", "name email");

    if (!report) {
      return res.status(404).json({ msg: "Report not found for this image." });
    }

    res.json(report);
  } catch (err) {
    console.error(`DB Error fetching report by filename "${req.params.filename}":`, err);
    res.status(500).send("Server Error");
  }
});
// =========================================================================
// === END OF CORRECTION                                                 ===
// =========================================================================
router.get("/statistics", authMiddleware, async (req, res) => {
  try {
    const stats = await MissingReport.aggregate([
      { $facet: {
          totalReports: [{ $count: "count" }],
          foundCount: [{ $match: { status: "Found" } }, { $count: "count" }],
          activeCases: [
            { $match: { status: "Verified" } },
            { $group: {
                _id: null,
                missingCount: { $sum: 1 },
                children: { $sum: { $cond: [{ $lt: ["$age", 18] }, 1, 0] } },
                male: { $sum: { $cond: [{ $and: [{ $gte: ["$age", 18] }, { $eq: ["$gender", "Male"] }] }, 1, 0] } },
                female: { $sum: { $cond: [{ $and: [{ $gte: ["$age", 18] }, { $eq: ["$gender", "Female"] }] }, 1, 0] } },
                other: { $sum: { $cond: [{ $and: [{ $gte: ["$age", 18] }, { $eq: ["$gender", "Other"] }] }, 1, 0] } }
              }
            }
          ]
        }
      }
    ]);

    const activeCaseData = stats[0].activeCases[0] || {};
    const formattedStats = {
      totalReports: stats[0].totalReports[0]?.count || 0,
      foundCount: stats[0].foundCount[0]?.count || 0,
      missingCount: activeCaseData.missingCount || 0,
      categoryStats: {
        total: activeCaseData.missingCount || 0,
        children: activeCaseData.children || 0,
        male: activeCaseData.male || 0,
        female: activeCaseData.female || 0,
        other: activeCaseData.other || 0,
      }
    };
    res.json(formattedStats);
  } catch (err) {
    console.error("Error fetching report statistics:", err);
    res.status(500).json({ msg: "Server error while fetching statistics." });
  }
});
router.get('/police-feed', authMiddleware, async (req, res) => {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const reports = await MissingReport.find({
            $or: [
                // --- THIS IS THE NEW LINE TO ADD ---
                // 1. Get ALL brand-new reports from the last 24 hours
                { status: 'Pending NGO Verification', reported_at: { $gte: twentyFourHoursAgo } },
                // ------------------------------------

                // 2. Get ALL reports that require police action (regardless of age)
                { status: 'Pending Police Verification' },

                // 3. Get recent updates from the last 24 hours
                { status: 'Verified', reviewedAt: { $gte: twentyFourHoursAgo } },
                { status: 'Found', foundAt: { $gte: twentyFourHoursAgo } },
                { status: 'Rejected', reviewedAt: { $gte: twentyFourHoursAgo } }
            ]
        })
        .populate('user', 'name')
        .sort({ reported_at: -1 });

        res.json(reports);

    } catch (err) {
        console.error('Error fetching police feed:', err.message);
        res.status(500).send('Server Error');
    }
});
router.get("/:id", async (req, res) => {
  try {
    const report = await MissingReport.findById(req.params.id).populate("user", "name email");
    if (!report) return res.status(404).json({ msg: "Report not found" });
    res.json(report);
  } catch (err) {
    console.error(`DB Error fetching report ${req.params.id}:`, err);
    res.status(500).send("Server Error");
  }
});


// =========================================================================
// ===          <<< DYNAMIC '/:id' ROUTE MUST COME AFTER >>>             ===
// =========================================================================



// --- STATUS UPDATE LOGIC ---
async function updateReportStatus(req, res, newStatus) {
  try {
    const report = await MissingReport.findById(req.params.id).populate("user", "name email");
    if (!report) {
      return res.status(404).json({ msg: "Report not found." });
    }
    const userId = req.user.id;
    if (newStatus === 'Verified' || newStatus === 'Rejected') {
      if (report.status === 'Pending Verification') {
          report.reviewedAt = new Date();
          report.reviewedByNgo = userId;
      }
    }
    if (newStatus === 'Found') {
        report.foundAt = new Date();
        // The user marking it found could be police or NGO
        report.foundByNgo = userId; // Can rename this field later if needed
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
        text = `Status: REJECTED\n\nYour report for ${report.person_name} has been rejected.`;
        inAppMessage = `Update: Your report for "${report.person_name}" has been rejected.`;
        break;
      case "Found":
        subject = `Wonderful News: ${report.person_name} has been Found!`;
        text = `We are overjoyed to inform you that ${report.person_name} has been found.`;
        inAppMessage = `Wonderful News! The missing person from your report, "${report.person_name}", has been found.`;
        break;
    }
    if (report.familyEmail) {
      await transporter.sendMail({ from: process.env.EMAIL_USER, to: report.familyEmail, subject, text });
    }
    if (report.user) {
      await new Notification({ recipient: report.user._id, message: inAppMessage }).save();
    }
    res.json({ msg: `Report status updated to '${newStatus}'. Notifications sent.` });
  } catch (err) {
    console.error(`Server error during status update:`, err);
    res.status(500).json({ msg: `Server error during status update.` });
  }
}

router.put("/verify/:id", authMiddleware, (req, res) => updateReportStatus(req, res, "Verified"));
router.put("/reject/:id", authMiddleware, (req, res) => updateReportStatus(req, res, "Rejected"));
router.put("/found/:id", authMiddleware, (req, res) => updateReportStatus(req, res, "Found"));
 

module.exports = router;