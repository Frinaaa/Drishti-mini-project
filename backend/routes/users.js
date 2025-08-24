const express = require('express');
const router = express.Router();
// Import all necessary models
const { User, Role, Notification } = require('../models');

/*
 * ROUTE: POST /api/users/register-ngo (UPDATED)
 * PURPOSE: Allows a new NGO to sign up with the new `verification_status`.
 */
router.post('/register-ngo', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ msg: 'Please provide all required fields.' });
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'A user with this email already exists.' });
    
    const ngoRole = await Role.findOne({ role_name: 'NGO' });
    if (!ngoRole) return res.status(500).json({ msg: 'System error: "NGO" role not found.' });

    user = new User({
      name,
      email,
      password, // Storing plain-text
      role: ngoRole._id,
      verification_status: 'Pending', // All new NGOs are 'Pending'
    });
    await user.save();
    res.status(201).json({ msg: 'Registration successful. Awaiting verification.' });
  } catch (err) {
    console.error("Error in /register-ngo:", err.message);
    res.status(500).send('Server Error');
  }
});

/*
 * ROUTE: GET /api/users/pending-ngos (UPDATED)
 * PURPOSE: Fetches all NGOs whose status is NOT 'Approved' for the police screen.
 */
router.get('/pending-ngos', async (req, res) => {
  try {
    const ngoRole = await Role.findOne({ role_name: 'NGO' });
    if (!ngoRole) return res.status(404).json({ msg: 'NGO role not found' });

    const pendingNgos = await User.find({
      role: ngoRole._id,
      verification_status: { $ne: 'Approved' }, // Gets both 'Pending' and 'Rejected'
    }).select('-password');

    res.json(pendingNgos);
  } catch (err) {
    console.error("Error in /pending-ngos:", err.message);
    res.status(500).send('Server Error');
  }
});

/*
 * ROUTE: PUT /api/users/update-ngo-status/:id (UPDATED)
 * PURPOSE: For police to Approve/Reject an NGO and create a notification.
 */
router.put('/update-ngo-status/:id', async (req, res) => {
  const { status } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ msg: 'Invalid status provided.' });

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'NGO user not found' });

    user.verification_status = status;
    await user.save();

    // --- Create a Notification for the NGO ---
    let notificationMessage = '';
    if (status === 'Approved') {
      notificationMessage = `Congratulations, ${user.name}! Your account has been verified. You can now log in and access all features.`;
    } else if (status === 'Rejected') {
      notificationMessage = `We regret to inform you that your registration for ${user.name} has been rejected.`;
    }

    if (notificationMessage) {
      const newNotification = new Notification({ recipient: user._id, message: notificationMessage });
      await newNotification.save();
    }

    res.json({ msg: `NGO has been successfully ${status.toLowerCase()}.` });
  } catch (err) {
    console.error("Error in /update-ngo-status:", err.message);
    res.status(500).send('Server Error');
  }
});

// --- YOUR EXISTING ROUTES FOR PROFILE MANAGEMENT (UNCHANGED) ---
router.get('/:id', async (req, res) => { /* ... your existing code ... */ });
router.put('/:id', async (req, res) => { /* ... your existing code ... */ });

module.exports = router;