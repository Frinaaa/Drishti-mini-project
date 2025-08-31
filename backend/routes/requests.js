const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { Request, User, Role } = require('../models');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });


// This route is correct and does not need changes.
router.post('/submit-for-registration', async (req, res) => {
  try {
    const { ngoName, registrationId, description, contactNumber, email, location, password, documentData } = req.body;
    
    if (!ngoName || !registrationId || !description || !contactNumber || !email || !location || !password || !documentData) {
        return res.status(400).json({ msg: 'All fields, including a password and ID proof, are required.' });
    }
    
    let existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ msg: 'A user with this email already exists.' });
    }

    const ngoRole = await Role.findOne({ role_name: 'NGO' });
    if (!ngoRole) return res.status(500).json({ msg: 'System error: NGO role not found.' });

    const newUser = new User({
        name: ngoName,
        email,
        password: password,
        role: ngoRole._id,
        status: 'Pending',
    });
    await newUser.save();

    const fileBuffer = Buffer.from(documentData.fileBase64, 'base64');
    const uniqueFilename = `${Date.now()}-${documentData.fileName}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFilename);
    fs.writeFileSync(filePath, fileBuffer);
    const documentPath = `uploads/${uniqueFilename}`;

    const lastRequest = await Request.findOne().sort({ dateOfRequest: -1 });
    const nextId = lastRequest ? parseInt(lastRequest.requestId.split('-')[1]) + 1 : 1001;
    const newRequestId = `REQ-${String(nextId).padStart(5, '0')}`;

    const newRequest = new Request({
      requestId: newRequestId,
      user: newUser._id,
      ngoName, registrationId, description, contactNumber, email, location, documentPath,
    });
    
    await newRequest.save();
    res.status(201).json({ msg: 'Your request has been submitted and is pending verification.' });
  } catch (err) {
    console.error("Error in /submit-for-registration:", err.message);
    res.status(500).send('Server Error');
  }
});


// This route is correct and does not need changes.
router.get('/pending-registrations', async (req, res) => {
  try {
    const ngoRole = await Role.findOne({ role_name: 'NGO' });
    if (!ngoRole) return res.status(404).json({ msg: 'NGO role not found' });
    
    const pendingUsers = await User.find({
        role: ngoRole._id,
        status: 'Pending'
    }).select('_id');

    const pendingUserIds = pendingUsers.map(user => user._id);

    const pendingRequests = await Request.find({
        user: { $in: pendingUserIds }
    }).sort({ dateOfRequest: -1 });

    res.json(pendingRequests);
  } catch (err) {
    console.error("Error in /pending-registrations:", err.message);
    res.status(500).send('Server Error');
  }
});


/*
 * ==================================================================
 * ROUTE: PUT /api/requests/approve-registration/:id (CORRECTED)
 * ==================================================================
 */
router.put('/approve-registration/:id', async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ msg: 'Request not found.' });
        }

        const user = await User.findById(request.user);
        if (!user) {
            return res.status(404).json({ msg: 'Associated user account not found.' });
        }
        
        if (user.status !== 'Pending') {
            return res.status(400).json({ msg: 'This request has already been actioned.' });
        }

        user.status = 'Approved';

        // --- THIS IS THE CRITICAL FIX ---
        // Save the change to the database.
        await user.save();
        
        res.json({ msg: `NGO '${request.ngoName}' has been approved and user account is now active.` });
    } catch (err) {
        console.error("Error in /approve-registration:", err.message);
        res.status(500).send('Server Error');
    }
});


/*
 * ==================================================================
 * ROUTE: PUT /api/requests/reject-registration/:id (CORRECTED)
 * ==================================================================
 */
router.put('/reject-registration/:id', async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ msg: 'Request not found.' });
        }
        
        const user = await User.findById(request.user);
        if (!user) {
            return res.status(404).json({ msg: 'Associated user account not found.' });
        }

        if (user.status !== 'Pending') {
            return res.status(400).json({ msg: 'This request has already been actioned.' });
        }

        user.status = 'Rejected';

        // --- THIS IS THE CRITICAL FIX ---
        // Save the change to the database.
        await user.save();
        
        res.json({ msg: `Registration request for '${request.ngoName}' has been rejected.` });
    } catch (err) {
        console.error("Error in /reject-registration:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;