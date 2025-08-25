// backend/routes/requests.js

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const { Request, User, Role } = require('../models');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/*
 * ==================================================================
 * ROUTE: POST /api/requests/submit-for-registration
 * (This route is correct, no changes needed)
 * ==================================================================
 */
router.post('/submit-for-registration', async (req, res) => {
  try {
    const { ngoName, registrationId, description, contactNumber, email, location, password, documentData } = req.body;
    
    if (!ngoName || !registrationId || !description || !contactNumber || !email || !location || !password || !documentData) {
        return res.status(400).json({ msg: 'All fields, including a password and ID proof, are required.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ msg: 'Password must be at least 6 characters long.' });
    }
    
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
      ngoName, registrationId, description, contactNumber, email, location, documentPath,
      password: password,
    });

    const salt = await bcrypt.genSalt(10);
    newRequest.password = await bcrypt.hash(password, salt);
    
    await newRequest.save();
    res.status(201).json({ msg: 'Your request has been submitted and is pending verification.' });
  } catch (err) {
    console.error("Error in /submit-for-registration:", err.message);
    res.status(500).send('Server Error');
  }
});

/*
 * ==================================================================
 * ROUTE: GET /api/requests/pending-registrations
 * (This route is correct, no changes needed)
 * ==================================================================
 */
router.get('/pending-registrations', async (req, res) => {
  try {
    const pendingRequests = await Request.find({ status: 'Pending Review' }).sort({ dateOfRequest: -1 });
    res.json(pendingRequests);
  } catch (err) {
    console.error("Error in /pending-registrations:", err.message);
    res.status(500).send('Server Error');
  }
});

/*
 * ==================================================================
 * ROUTE: PUT /api/requests/approve-registration/:id
 * (This route is correct, no changes needed)
 * ==================================================================
 */
router.put('/approve-registration/:id', async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);
        if (!request || request.status !== 'Pending Review') {
            return res.status(404).json({ msg: 'Request not found or has already been actioned.' });
        }

        let user = await User.findOne({ email: request.email });
        if (user) return res.status(400).json({ msg: 'A user with this email already exists.' });

        const ngoRole = await Role.findOne({ role_name: 'NGO' });
        if (!ngoRole) return res.status(500).json({ msg: 'System error: NGO role not found' });
        
        user = new User({
            name: request.ngoName,
            email: request.email,
            password: request.password, 
            role: ngoRole._id,
            verification_status: 'Approved', // Set verification status for the new user
        });
        
        await user.save();

        request.status = 'Approved';
        request.ngo_user = user._id;
        await request.save();
        
        res.json({ msg: `NGO '${request.ngoName}' has been approved and user account created.` });
    } catch (err) {
        console.error("Error in /approve-registration:", err.message);
        res.status(500).send('Server Error');
    }
});

/*
 * ==================================================================
 * ROUTE: PUT /api/requests/reject-registration/:id (NEWLY ADDED)
 * PURPOSE: Handles the rejection action from the frontend.
 * ==================================================================
 */
router.put('/reject-registration/:id', async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);
        if (!request || request.status !== 'Pending Review') {
            return res.status(404).json({ msg: 'Request not found or has already been actioned.' });
        }

        request.status = 'Rejected';
        await request.save();
        
        res.json({ msg: `Registration request for '${request.ngoName}' has been rejected.` });
    } catch (err) {
        console.error("Error in /reject-registration:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;