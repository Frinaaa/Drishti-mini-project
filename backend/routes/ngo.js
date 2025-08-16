const express = require('express');
const router = express.Router();
const { User, Role } = require('../models'); 

// @route   POST api/ngo/register
// @desc    Police registers a new NGO user
// @access  Should be protected (police-only) in a real app
router.post('/register', async (req, res) => {
    const { ngoName, email, password, ngoId, address, contactNumber, location } = req.body;

    if (!ngoName || !email || !password) {
        return res.status(400).json({ msg: 'Please enter at least the NGO Name, Email, and Password.' });
    }

    try {
        // 1. Check if an NGO with this email already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'An account with this email already exists.' });
        }

        // 2. Find the 'NGO' role from the database
        const ngoRole = await Role.findOne({ role_name: 'NGO' });
        if (!ngoRole) {
            // This is a server configuration error
            return res.status(500).json({ msg: '"NGO" user role not found. Please contact an administrator.' });
        }

        // 3. Create the new user object
        user = new User({
            name: ngoName, // The User model's 'name' field will store the NGO name
            email,
            password, // Storing password as plain text as per previous setup
            role: ngoRole._id,
            // Note: Other details like address, ngoId, etc., would need to be added to the UserSchema in models.js to be saved.
        });

        // 4. Save the new user to the database
        await user.save();
        res.status(201).json({ msg: `${ngoName} has been registered and can now log in.` });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;