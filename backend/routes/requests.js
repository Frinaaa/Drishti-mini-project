// backend/routes/requests.js

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
// const bcrypt = require('bcryptjs'); // Hashing is intentionally disabled.
const { Request, User, Role, Notification } = require('../models');

// Directory setup
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads','request');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// @route   POST /api/requests/submit-for-registration
router.post('/submit-for-registration', async (req, res) => {
  try {
    const { ngoName, registrationId, description, contactNumber, email, location, password, pinCode, documentData } = req.body;
    if (!ngoName || !registrationId || !description || !contactNumber || !email || !location || !password || !pinCode || !documentData || !documentData.fileBase64) {
        return res.status(400).json({ msg: 'All fields, including a password, PIN code, and ID proof, are required.' });
    }
    if (await Request.findOne({ email, status: { $in: ['Pending', 'Approved'] } })) {
        return res.status(400).json({ msg: 'An application with this email is already pending or approved.' });
    }
    if (await User.findOne({ email })) {
        return res.status(400).json({ msg: 'An active user account with this email already exists.' });
    }
    const rawBase64 = documentData.fileBase64;
    const pureBase64 = rawBase64.replace(/^data:image\/\w+;base64,/, "");
    const fileBuffer = Buffer.from(pureBase64, 'base64');
    const uniqueFilename = `${Date.now()}-${documentData.fileName || 'document.jpg'}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFilename);
    fs.writeFileSync(filePath, fileBuffer);
    const documentPath = `uploads/request/${uniqueFilename}`;
    const newRequest = new Request({
      ngoName, registrationId, description, contactNumber, email, location,
      proposedPassword: password, // Password stored in plain text
      pinCode,
      documentPath,
      status: 'Pending',
    });
    await newRequest.save();
    res.status(201).json({ msg: 'Your application has been submitted and is pending review.' });
  } catch (err) {
    console.error("🔴 [Backend Error] /submit-for-registration:", err);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/requests/all-applications
router.get('/all-applications', async (req, res) =>  {
  try {
    const applications = await Request.find({}).populate('approvedUser', 'name email status').sort({ dateOfRequest: -1 });
    res.json(applications);
  } catch (err) {
    console.error("🔴 [Backend Error] /all-applications:", err);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/requests/approve-application/:id
// [MODIFIED] Saves the proposed password directly without hashing.
router.put('/approve-application/:id', async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);
        if (!request || request.status !== 'Pending') {
            return res.status(400).json({ msg: 'Application not found or has already been actioned.' });
        }
        const ngoRole = await Role.findOne({ role_name: 'NGO' });
        if (!ngoRole) {
            return res.status(500).json({ msg: 'System error: "NGO" role not found.' });
        }

        const newUser = new User({
            name: request.ngoName,
            email: request.email,
            password: request.proposedPassword, // Use the plain text password from the request
            pinCode: request.pinCode,
            role: ngoRole._id,
            status: 'Active', // Use 'Active' to pass the schema validation
        });
        await newUser.save();
        console.log(`✅ User '${newUser.name}' CREATED in 'users' collection (password not hashed).`);

        request.status = 'Approved';
        request.approvedUser = newUser._id;
        await request.save();
        console.log(`✅ Request '${request._id}' UPDATED to 'Approved'.`);

        const notificationMessage = `Congratulations, ${request.ngoName}! Your application has been approved. You can now log in.`;
        const newNotification = new Notification({ recipient: newUser._id, message: notificationMessage });
        await newNotification.save();

        res.json({ msg: `Application for '${request.ngoName}' approved. User account created.` });
    } catch (err) {
        console.error("🔴 [Backend Error] /approve-application:", err);
        res.status(500).json({ msg: 'Server Error during approval process.', error: err.message });
    }
});

// @route   PUT /api/requests/reject-application/:id
router.put('/reject-application/:id', async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);
        if (!request || request.status !== 'Pending') {
            return res.status(404).json({ msg: 'Application not found or has already been actioned.' });
        }
        request.status = 'Rejected';
        await request.save();
        res.json({ msg: `Application for '${request.ngoName}' has been rejected.` });
    } catch (err) {
        console.error("🔴 [Backend Error] /reject-application:", err);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/requests/freeze-user/:_id
router.put('/freeze-user/:_id', async (req, res) => {
    try { 
        const request = await Request.findById(req.params._id);
        if (!request || !request.approvedUser) {
            return res.status(404).json({ msg: 'No approved user found for this request.' });
        }
        await User.updateOne({ _id: request.approvedUser }, { $set: { status: 'Frozen' } });
        res.json({ msg: `NGO user account has been frozen.` });
    } catch (err)
 {
        console.error("🔴 [Backend Error] /freeze-user:", err);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/requests/unfreeze-user/:_id
router.put('/unfreeze-user/:_id', async (req, res) => {
    try {
        const request = await Request.findById(req.params._id);
        if (!request || !request.approvedUser) {
            return res.status(404).json({ msg: 'No approved user found for this request.' });
        }
        await User.updateOne({ _id: request.approvedUser }, { $set: { status: 'Active' } });
        res.json({ msg: `NGO user account has been unfrozen.` });
    } catch (err) {
        console.error("🔴 [Backend Error] /unfreeze-user:", err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;