// backend/routes/requests.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Request } = require('../models');

// Configure Multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // The directory you created
  },
  filename: function (req, file, cb) {
    // Create a unique filename to avoid overwrites
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

// @route   POST /api/requests/submit
// @desc    Submit a new request from an NGO with a document
// @access  Private
// Use multer middleware here: upload.single('document')
// 'document' MUST match the key used in the FormData on the frontend
router.post('/submit', upload.single('document'), async (req, res) => {
  const { location, contact } = req.body;

  try {
    const newRequest = new Request({
      location,
      contact,
      // If a file was uploaded, req.file will be available
      documentPath: req.file ? req.file.path : null,
    });

    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- Keep your GET and PUT routes for police verification ---

module.exports = router;