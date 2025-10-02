const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { Request, User, Role, Notification } = require('../models');

// --- DIRECTORY SETUP (remains the same) ---
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads','request');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}


// @route   POST /api/requests/submit-for-registration
// @desc    A new NGO submits their application form.
// @access  Public
router.post('/submit-for-registration', async (req, res) => {
  console.log('--- [Backend] /submit-for-registration hit ---');
  try {
    const { ngoName, registrationId, description, contactNumber, email, location, password, documentData } = req.body;

    // --- Validation (remains the same) ---
    if (!ngoName || !registrationId || !description || !contactNumber || !email || !location || !password || !documentData || !documentData.fileBase64) {
        return res.status(400).json({ msg: 'All fields, including a password and ID proof, are required.' });
    }
    if (await Request.findOne({ email, status: { $in: ['Pending', 'Approved'] } })) {
        return res.status(400).json({ msg: 'An application with this email is already pending or approved.' });
    }
    if (await User.findOne({ email })) {
        return res.status(400).json({ msg: 'An active user account with this email already exists.' });
    }
    
    // --- [THE FIX] File Handling with Prefix Stripping ---

    // 1. Get the raw base64 string from the request body.
    const rawBase64 = documentData.fileBase64;

    // FOR DEBUGGING: Log the first 100 characters to see if the prefix exists
    console.log('Received Base64 prefix:', rawBase64.substring(0, 100));

    // 2. Use a regular expression to remove the data URI prefix (e.g., "data:image/jpeg;base64,").
    //    This makes the code robustly handle cases where the prefix is or isn't present.
    const pureBase64 = rawBase64.replace(/^data:image\/\w+;base64,/, "");

    // 3. Create the buffer from the *pure* base64 data.
    const fileBuffer = Buffer.from(pureBase64, 'base64');
    
    const uniqueFilename = `${Date.now()}-${documentData.fileName || 'document.jpg'}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFilename);
    fs.writeFileSync(filePath, fileBuffer);
    const documentPath = `uploads/${uniqueFilename}`;

    // --- Create and Save the New Request Document ---
    const newRequest = new Request({
      ngoName, registrationId, description, contactNumber, email, location,
      proposedPassword: password, documentPath, status: 'Pending',
    });
    await newRequest.save();
    console.log('✅ New application saved successfully:', newRequest._id);

    res.status(201).json({ msg: 'Your application has been submitted and is pending review.' });
  } catch (err) {
    console.error("🔴 [Backend Error] /submit-for-registration:", err);
    res.status(500).send('Server Error');
  }
});


// @route   GET /api/requests/all-applications
// @desc    Police fetch the list of all NGO applications.
// @access  Private (Police only)
router.get('/all-applications', async (req, res) =>  {
  try {
    const applications = await Request.find({})
                                     // `.populate` links the `approvedUser` ID to the actual user document
                                     // and returns the specified fields. This is crucial for the frontend.
                                     .populate('approvedUser', 'name email status')
                                     .sort({ dateOfRequest: -1 }); // Show newest first
    res.json(applications);
  } catch (err) {
    console.error("🔴 [Backend Error] /all-applications:", err);
    res.status(500).send('Server Error');
  }
});


// @route   PUT /api/requests/approve-application/:id
// @desc    Police approve an application, which creates a new User.
// @access  Private (Police only)
router.put('/approve-application/:id', async (req, res) => {
    try {
        // Step 1: Find the application and validate it's pending.
        const request = await Request.findById(req.params.id);
        if (!request || request.status !== 'Pending') {
            return res.status(400).json({ msg: 'Application not found or has already been actioned.' });
        }

        // Step 2: Find the 'NGO' role needed to create the user.
        const ngoRole = await Role.findOne({ role_name: 'NGO' });
        if (!ngoRole) {
            return res.status(500).json({ msg: 'System error: "NGO" role not found.' });
        }

        // Step 3: Create the new User document in the 'users' collection.
        const newUser = new User({
            name: request.ngoName,
            email: request.email,
            password: request.proposedPassword, // Use the password from the application
            role: ngoRole._id,
            status: 'Active', // The new user is active immediately upon approval
        });
        await newUser.save();
        console.log(`✅ User '${newUser.name}' CREATED in 'users' collection.`);

        // Step 4: Update the original application document.
        request.status = 'Approved';
        request.approvedUser = newUser._id; // Link the application to the new user
        await request.save();
        console.log(`✅ Request '${request._id}' UPDATED to 'Approved'.`);

        // Step 5: Create an in-app notification for the newly created user.
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
// @desc    Police reject a pending application.
// @access  Private (Police only)
router.put('/reject-application/:id', async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);
        if (!request || request.status !== 'Pending') {
            return res.status(404).json({ msg: 'Application not found or has already been actioned.' });
        }
        request.status = 'Rejected';
        await request.save();
        console.log(`✅ Request '${request._id}' UPDATED to 'Rejected'.`);
        res.json({ msg: `Application for '${request.ngoName}' has been rejected.` });
    } catch (err) {
        console.error("🔴 [Backend Error] /reject-application:", err);
        res.status(500).send('Server Error');
    }
});


// @route   PUT /api/requests/freeze-user/:_id
// @desc    Police freeze an approved NGO's user account.
// @access  Private (Police only)
router.put('/freeze-user/:_id', async (req, res) => {
    try { 
        const request = await Request.findById(req.params._id);
        if (!request || !request.approvedUser) {
            return res.status(404).json({ msg: 'No approved user found for this request.' });
        }
        // Use `updateOne` for a more efficient database operation
        await User.updateOne({ _id: request.approvedUser }, { $set: { status: 'Frozen' } });
        res.json({ msg: `NGO user account has been frozen.` });
    } catch (err) {
        console.error("🔴 [Backend Error] /freeze-user:", err);
        res.status(500).send('Server Error');
    }
});


// @route   PUT /api/requests/unfreeze-user/:_id
// @desc    Police unfreeze an NGO's user account.
// @access  Private (Police only)
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