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