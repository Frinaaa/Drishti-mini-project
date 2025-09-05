const express = require('express');
const router = express.Router();
const { User, Role } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up Multer storage for profile photos
const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads/profile');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, `${req.params.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const uploadProfile = multer({
    storage: profileStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpeg, jpg, png, gif) are allowed!'));
    }
});

// @route   POST /api/users/add-admin
// @desc    Creates a new user with the 'Police' role
// @access  Private (should be protected by an existing admin's token)
router.post('/add-admin', async (req, res) => {
    console.log('\n--- [Backend] /api/users/add-admin endpoint hit ---');
    try {
        // Step 1: Get the data from the frontend
        const { name, email, password } = req.body;
        console.log(`[1/5] Received data: Name=${name}, Email=${email}`);

        // Step 2: Perform server-side validation
        if (!name || !email || !password || password.length < 6) {
            console.log('🔴 [FAIL] Validation failed. Missing fields or short password.');
            return res.status(400).json({ msg: 'Please provide all fields. Password must be at least 6 characters.' });
        }
        console.log('✅ [SUCCESS] Initial validation passed.');

        // Step 3: Check if a user with this email already exists
        console.log(`[2/5] Checking if user with email '${email}' already exists...`);
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('🔴 [FAIL] User with this email already exists.');
            return res.status(400).json({ msg: 'A user with this email already exists.' });
        }
        console.log('✅ [SUCCESS] Email is available.');

        // Step 4: Find the 'Police' role document to get its ID
        console.log('[3/5] Finding "Police" role in the database...');
        const policeRole = await Role.findOne({ role_name: 'Police' });
        if (!policeRole) {
            console.log('🔴 [FAIL] "Police" role not found. Please ensure it exists in the "roles" collection.');
            return res.status(500).json({ msg: 'System error: "Police" role not found.' });
        }
        console.log(`✅ [SUCCESS] "Police" role found with ID: ${policeRole._id}`);

        // Step 5: Create and save the new user
        console.log('[4/5] Creating new User object...');
        const newUser = new User({
            name,
            email,
            password, // IMPORTANT: This should be hashed in a real-world app
            role: policeRole._id,
            status: 'Active',
        });
        
        console.log('[5/5] Attempting to save the new user to the "users" collection...');
        await newUser.save();
        console.log(`✅ [SUCCESS] User for '${name}' has been successfully saved to the database!`);

        // Send a success response back to the frontend
        res.status(201).json({ msg: `Admin account for '${name}' created successfully.` });

    } catch (err) {
        // This will now catch any error that happens during the .save() operation
        console.error('🔴 [CRITICAL FAIL] An error occurred during the add-admin process:', err);
        res.status(500).json({ msg: 'Server error while creating admin.', error: err.message });
    }
});
// --- END OF THE CORRECTED ROUTE ---


// @route   GET /api/users/ngos
router.get('/ngos', async (req, res) => {
    try {
        const ngoRole = await Role.findOne({ role_name: 'NGO' });
        if (!ngoRole) return res.status(404).json({ msg: 'System error: NGO role not found.' });
        const ngos = await User.find({ role: ngoRole._id }).select('-password');
        res.json(ngos);
    } catch (err) {
        console.error("🔴 [Backend Error] /api/users/ngos:", err);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/users/:id
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json({ user });
    } catch (err) {
        console.error(`🔴 [Backend Error] /api/users/${req.params.id}:`, err);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/users/:id
// New: Middleware 'uploadProfile.single('profile_photo')' added to handle photo upload
router.put('/:id', uploadProfile.single('profile_photo'), async (req, res) => {
    const { name, email, gender, currentPassword, newPassword } = req.body; // Include password fields
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        if (name) user.name = name;
        if (email) user.email = email;
        if (gender) user.gender = gender;

        // Handle profile photo upload
        if (req.file) {
            // If an old photo exists, delete it
            if (user.profile_photo) {
                const oldPhotoPath = path.join(__dirname, '../', user.profile_photo);
                if (fs.existsSync(oldPhotoPath)) {
                    fs.unlinkSync(oldPhotoPath);
                }
            }
            // Save the new photo path (relative to /uploads directory)
            user.profile_photo = `/uploads/profile/${req.file.filename}`;
        }

        // Handle password change logic
        if (newPassword && currentPassword) {
            // Here you would typically hash and compare currentPassword with user.password
            // For simplicity, this example assumes a direct comparison or some placeholder.
            // In a real app, you MUST use bcrypt or a similar library.
            // Example: const isMatch = await bcrypt.compare(currentPassword, user.password);
            // if (!isMatch) return res.status(400).json({ msg: 'Incorrect current password' });
            // user.password = await bcrypt.hash(newPassword, 10); // Hash the new password
            // Placeholder for demonstration:
            if (currentPassword !== 'dummy_current_password') { // Replace with actual password validation
                 return res.status(400).json({ msg: 'Incorrect current password' });
            }
            user.password = newPassword; // ! IMPORTANT: In a real app, hash this password
        }

        await user.save();
        const updatedUser = await User.findById(req.params.id).select('-password');
        res.json({ msg: 'Profile updated successfully', user: updatedUser });
    } catch (err) {
        console.error(`🔴 [Backend Error] /api/users/${req.params.id} (PUT):`, err);
        if (err.message.includes('Only images')) {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;