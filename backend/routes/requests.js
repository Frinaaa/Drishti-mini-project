// backend/routes/requests.js

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { Request, User, Role, Notification } = require('../models');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// --- NGO APPLICATION SUBMISSION ---
router.post('/submit-for-registration', async (req, res) => {
  try {
    const { ngoName, registrationId, description, contactNumber, email, location, password, documentData } = req.body;
    if (!ngoName || !registrationId || !description || !contactNumber || !email || !location || !password || !documentData) { return res.status(400).json({ msg: 'All fields are required.' }); }
    if (await Request.findOne({ email, status: { $in: ['Pending', 'Approved'] } })) { return res.status(400).json({ msg: 'An application with this email is already pending or approved.' }); }
    if (await User.findOne({ email })) { return res.status(400).json({ msg: 'An active user account with this email already exists.' }); }
    
    const fileBuffer = Buffer.from(documentData.fileBase64, 'base64');
    const uniqueFilename = `${Date.now()}-${documentData.fileName}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFilename);
    fs.writeFileSync(filePath, fileBuffer);
    const documentPath = `uploads/${uniqueFilename}`;

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
    console.error("🔴 [Backend Error] /submit-for-registration:", err);
    res.status(500).send('Server Error');
  }
});



// --- FETCH ALL APPLICATIONS ---
router.get('/all-applications', async (req, res) => {
  try {
    const applications = await Request.find({}).populate('approvedUser', 'name email status').sort({ dateOfRequest: -1 });
    res.json(applications);
  } catch (err) {
    console.error("🔴 [Backend Error] /all-applications:", err);
    res.status(500).send('Server Error');
  }
});

// --- APPROVE NGO APPLICATION (WITH DETAILED LOGGING) ---
router.put('/approve-application/:id', async (req, res) => {
    console.log(`\n--- [Backend] APPROVE request received for ID: ${req.params.id} ---`);
    try {
        // Step 1: Find the application in the 'requests' collection
        console.log('[1/7] Finding application in "requests" collection...');
        const request = await Request.findById(req.params.id);
        if (!request || request.status !== 'Pending') {
            console.log('🔴 [FAIL] Application not found or status is not "Pending".');
            return res.status(400).json({ msg: 'Application not found or already actioned.' });
        }
        console.log('✅ [SUCCESS] Application found.');

        // Step 2: Find the 'NGO' role
        console.log('[2/7] Finding "NGO" role...');
        const ngoRole = await Role.findOne({ role_name: 'NGO' });
        if (!ngoRole) {
            console.log('🔴 [FAIL] "NGO" role not found in the "roles" collection. Please seed the database.');
            return res.status(500).json({ msg: 'System error: NGO role not found.' });
        }
        console.log('✅ [SUCCESS] "NGO" role found.');

        // Step 3: Prepare the new User object
        console.log('[3/7] Preparing new User object...');
        const newUser = new User({
            name: request.ngoName,
            email: request.email,
            password: request.proposedPassword, // In a real app, this should be hashed
            role: ngoRole._id,
            status: 'Active', // The new user account is 'Active' by default
        });
        console.log('✅ [SUCCESS] New User object prepared.');

        // Step 4: Save the new User to the 'users' collection
        console.log('[4/7] Saving new User to "users" collection...');
        await newUser.save();
        console.log(`✅ [SUCCESS] User '${newUser.name}' CREATED successfully in 'users' collection.`);

        // Step 5: Update the original request document
        console.log('[5/7] Updating original request status to "Approved"...');
        request.status = 'Approved';
        request.approvedUser = newUser._id;
        await request.save();
        console.log(`✅ [SUCCESS] Request '${request.requestId}' UPDATED successfully.`);

        // Step 6: Create a notification
        console.log('[6/7] Creating notification...');
        const notificationMessage = `Congratulations, ${request.ngoName}! Your application has been approved.`;
        const newNotification = new Notification({ recipient: newUser._id, message: notificationMessage });
        await newNotification.save();
        console.log('✅ [SUCCESS] Notification created.');
        
        // Step 7: Send final success response
        console.log('[7/7] Sending success response to frontend.');
        res.json({ msg: `Application for '${request.ngoName}' approved. User account created.` });

    } catch (err) {
        console.error("🔴 [CRITICAL FAIL] An error occurred during the approval process:", err);
        res.status(500).json({ msg: 'Server Error during approval.', error: err.message });
    }
});

// --- REJECT NGO APPLICATION ---
router.put('/reject-application/:id', async (req, res) =>{
    try {
        const request = await Request.findById(req.params.id);
        if (!request || request.status !== 'Pending') { return res.status(404).json({ msg: 'Application not found or already actioned.' }); }
        
        request.status = 'Rejected';
        await request.save();
        
        res.json({ msg: `Application for '${request.ngoName}' has been rejected.` });
    } catch (err) {
        console.error("🔴 [Backend Error] /reject-application:", err);
        res.status(500).send('Server Error');
    }
});


// --- FREEZE/UNFREEZE USER ROUTES ---
router.put('/freeze-user/:requestId', async (req, res) =>{
    try {
        const request = await Request.findById(req.params.requestId);
        if (!request || !request.approvedUser) { return res.status(404).json({ msg: 'No approved user found for this request.' }); }
        
        await User.updateOne({ _id: request.approvedUser }, { $set: { status: 'Frozen' } });
        
        res.json({ msg: `NGO user account has been frozen.` });
    } catch (err) {
        console.error("🔴 [Backend Error] /freeze-user:", err);
        res.status(500).send('Server Error');
    }
});

// IMPORTANT: Make sure your /submit-for-registration route is included in this file
// [-] REMOVED DUPLICATE ROUTE DEFINITION:
/*
router.post('/submit-for-registration', async (req, res) =>  {
  try {
    const { ngoName, registrationId, description, contactNumber, email, location, password, documentData } = req.body;
    if (!ngoName || !registrationId || !description || !contactNumber || !email || !location || !password || !documentData) { return res.status(400).json({ msg: 'All fields are required.' }); }
    if (await Request.findOne({ email, status: { $in: ['Pending', 'Approved'] } })) { return res.status(400).json({ msg: 'An application with this email is already pending or approved.' }); }
    if (await User.findOne({ email })) { return res.status(400).json({ msg: 'An active user account with this email already exists.' }); }
    
    const fileBuffer = Buffer.from(documentData.fileBase64, 'base64');
    const uniqueFilename = `${Date.now()}-${documentData.fileName}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFilename);
    fs.writeFileSync(filePath, fileBuffer);
    const documentPath = `uploads/${uniqueFilename}`;

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
    console.error("🔴 [Backend Error] /submit-for-registration:", err);
    res.status(500).send('Server Error');
  }
});
*/


module.exports = router;