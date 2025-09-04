// backend/routes/requests.js
/* eslint-env node */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { Request, User, Role, Notification } = require('../models');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads','request'); // eslint-disable-line no-undef
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// --- NGO APPLICATION SUBMISSION ---
router.post('/submit-for-registration', async (req, res) => {
  try {
    const { ngoName, registrationId, description, contactNumber, email, location, password, documentData } = req.body;

    if (!ngoName || !registrationId || !description || !contactNumber || !email || !location || !password || !documentData) {
      return res.status(400).json({ msg: 'All fields are required.' });
    }

    if (await Request.findOne({ email, status: { $in: ['Pending', 'Approved'] } })) {
      return res.status(400).json({ msg: 'An application with this email is already pending or approved.' });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ msg: 'An active user account with this email already exists.' });
    }

    const fileBuffer = Buffer.from(documentData.fileBase64, 'base64'); // eslint-disable-line no-undef
    const uniqueFilename = `${Date.now()}-${documentData.fileName}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFilename);
    fs.writeFileSync(filePath, fileBuffer);
    const documentPath = `uploads/request/${uniqueFilename}`;

    const lastRequest = await Request.findOne().sort({ dateOfRequest: -1 });
    const nextId = lastRequest ? parseInt(lastRequest.requestId.split('-')[1]) + 1 : 1001;
    const newRequestId = `REQ-${String(nextId).padStart(5, '0')}`;

    const newRequest = new Request({
      requestId: newRequestId, ngoName, registrationId, description, contactNumber, email, location,
      proposedPassword: password, documentPath, status: 'Pending',
    });

    await newRequest.save();
    res.status(201).json({ msg: 'Your application has been submitted and is pending review.' });
  } catch (err) {
    console.error("Error in NGO application submission:", err.message);
    res.status(500).json({ msg: 'Server Error during registration submission.', error: err.message });
  }
});



// --- FETCH ALL APPLICATIONS ---
router.get('/all-applications', async (req, res) => {
  try {
    const applications = await Request.find({})
      .populate('approvedUser', 'name email status')
      .sort({ dateOfRequest: -1 });
    res.json(applications);
  } catch (err) {
    console.error("Error fetching applications:", err.message);
    res.status(500).json({ msg: 'Server Error fetching applications.', error: err.message });
  }
});

// --- APPROVE NGO APPLICATION ---
router.put('/approve-application/:id', async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request || request.status !== 'Pending') {
      return res.status(400).json({ msg: 'Application not found or already actioned.' });
    }

    const ngoRole = await Role.findOne({ role_name: 'NGO' });
    if (!ngoRole) {
      return res.status(500).json({ msg: 'System error: NGO role not found.' });
    }

    if (!request.proposedPassword || request.proposedPassword.trim() === '') {
      return res.status(400).json({ msg: 'No password provided in the application.' });
    }

    const newUser = new User({
      name: request.ngoName,
      email: request.email,
      password: request.proposedPassword.trim(), // In a real app, this should be hashed
      role: ngoRole._id,
      status: 'Active',
    });

    await newUser.save();

    request.status = 'Approved';
    request.approvedUser = newUser._id;
    await request.save();

    const notificationMessage = `Congratulations, ${request.ngoName}! Your application has been approved.`;
    const newNotification = new Notification({ recipient: newUser._id, message: notificationMessage });
    await newNotification.save();

    res.json({ msg: `Application for '${request.ngoName}' approved. User account created.` });
  } catch (err) {
    console.error("Error during approval process:", err.message);
    res.status(500).json({ msg: 'Server Error during approval.', error: err.message });
  }
});

// --- REJECT NGO APPLICATION ---
router.put('/reject-application/:id', async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request || request.status !== 'Pending') {
      return res.status(404).json({ msg: 'Application not found or already actioned.' });
    }

    request.status = 'Rejected';
    await request.save();

    res.json({ msg: `Application for '${request.ngoName}' has been rejected.` });
  } catch (err) {
    console.error("Error during rejection process:", err.message);
    res.status(500).json({ msg: 'Server Error during rejection.', error: err.message });
  }
});


// --- FREEZE/UNFREEZE USER ROUTES ---
router.put('/freeze-user/:requestId', async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId);
    if (!request || !request.approvedUser) {
      return res.status(404).json({ msg: 'No approved user found for this request.' });
    }

    await User.updateOne({ _id: request.approvedUser }, { $set: { status: 'Frozen' } });
    res.json({ msg: `NGO user account has been frozen.` });
  } catch (err) {
    console.error("Error during freeze operation:", err.message);
    res.status(500).json({ msg: 'Server Error during freeze operation.', error: err.message });
  }
});

router.put('/unfreeze-user/:requestId', async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId);
    if (!request || !request.approvedUser) {
      return res.status(404).json({ msg: 'No approved user found for this request.' });
    }

    await User.updateOne({ _id: request.approvedUser }, { $set: { status: 'Active' } });
    res.json({ msg: `NGO user account has been unfrozen.` });
  } catch (err) {
    console.error("Error during unfreeze operation:", err.message);
    res.status(500).json({ msg: 'Server Error during unfreeze operation.', error: err.message });
  }
});

module.exports = router;