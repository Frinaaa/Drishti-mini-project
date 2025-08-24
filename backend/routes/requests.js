const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { Request } = require('../models');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// --- API ROUTES ---
router.post('/submit', async (req, res) => {
  try {
    const { location, contact, documentData } = req.body;
    // IMPORTANT: Make sure this is a real _id of an NGO user from your database.
    const ngoUserId = "667104052062580a87f73a5a"; // Replace if needed

    let documentPath = null;
    if (documentData && documentData.fileBase64 && documentData.fileName) {
      const fileBuffer = Buffer.from(documentData.fileBase64, 'base64');
      const uniqueFilename = `${Date.now()}-${documentData.fileName}`;
      const filePath = path.join(UPLOADS_DIR, uniqueFilename);
      fs.writeFileSync(filePath, fileBuffer);
      documentPath = `uploads/${uniqueFilename}`;
    }

    /*
     * ==================================================================
     * THIS IS THE FIX
     * We will now manually generate the requestId here to ensure it always exists.
     * ==================================================================
     */
    // 1. Find the most recently created request to determine the next ID number.
    const lastRequest = await Request.findOne().sort({ dateOfRequest: -1 });
    // 2. Calculate the next ID. If no requests exist, start at 1001.
    const nextId = lastRequest ? parseInt(lastRequest.requestId.split('-')[1]) + 1 : 1001;
    // 3. Format the ID string (e.g., 'REQ-01001').
    const newRequestId = `REQ-${String(nextId).padStart(5, '0')}`;

    // Create the new request, now including the manually generated requestId.
    const newRequest = new Request({
      requestId: newRequestId, // We now provide the required field
      location,
      contact,
      documentPath,
      ngo_user: ngoUserId,
    });

    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (err) {
    // This catch block will no longer be triggered by the validation error.
    console.error("Error in /api/requests/submit:", err.message);
    res.status(500).send('Server Error');
  }
});

// The GET and PUT routes remain the same.
router.get('/pending', async (req, res) => {
  try {
    const pendingRequests = await Request.find({ status: 'Pending Review' })
      .populate('ngo_user', ['name', 'email'])
      .sort({ dateOfRequest: -1 });
    res.json(pendingRequests);
  } catch (err) {
    console.error("Error in /api/requests/pending:", err.message);
    res.status(500).send('Server Error');
  }
});

router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const requestId = req.params.id;
        const allowedStatus = ['Approved', 'Rejected'];
        if (!allowedStatus.includes(status)) {
            return res.status(400).json({ msg: 'Invalid status provided.' });
        }
        const updatedRequest = await Request.findByIdAndUpdate(requestId, { status }, { new: true });
        if (!updatedRequest) {
            return res.status(404).json({ msg: 'Request not found.' });
        }
        res.json(updatedRequest);
    } catch (err) {
        console.error("Error in /api/requests/:id/status:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;