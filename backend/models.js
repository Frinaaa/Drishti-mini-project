const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Defines user roles like 'Family', 'Police', 'NGO'
const RoleSchema = new Schema({
    role_name: { type: String, required: true, unique: true }
});

// Defines the documents in the 'users' collection. This is where approved NGOs will be stored.
const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    // New: Field to store the path to the user's profile photo
    profile_photo: { type: String, default: null },
    // This status is for the user account itself (e.g., Active, Frozen)
    status: {
        type: String,
        enum: ['Active', 'Frozen', 'Blocked'], // The account can ONLY be one of these.
        default: 'Active'
    },
});

// Defines the documents in the 'requests' collection. This is for new applications.
const RequestSchema = new Schema({
    requestId: { type: String, required: true, unique: true },
    ngoName: { type: String, required: true },
    // --- CORRECTED THIS LINE ---
    registrationId: { type: String, required: true }, // Changed from `type: true` to `type: String`
    // ---------------------------
    description: { type: String, required: true },
    contactNumber: { type: String, required: true },
    email: { type: String, required: true },
    location: { type: String, required: true },
    documentPath: { type: String, required: true },
    proposedPassword: { type: String, required: true },
    dateOfRequest: { type: Date, default: Date.now },
    // This status is for the application itself.
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    // After approval, this field will store the ID of the new user from the 'users' collection.
    approvedUser: { type: Schema.Types.ObjectId, ref: 'User' },
});

// Defines the documents in the 'notifications' collection.
const NotificationSchema = new Schema({
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    is_read: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now }
});

const MissingReportSchema = new Schema({
    // The family member who filed the report
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    person_name: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    age: { type: Number, required: true },
    last_seen: { type: String, required: true },

    // ADDED: The new report fields from code2
    description: { type: String },
    relationToReporter: { type: String },
    reporterContact: { type: String },

    photo_url: { type: String },
    status: { type: String, default: 'Pending', required: true },
    reported_at: { type: Date, default: Date.now }
});

// UploadedPhoto Schema
const UploadedPhotoSchema = new Schema({
    // The user (e.g., NGO) who uploaded the photo
    uploader: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    location: { type: String, required: true },
    image_url: { type: String, required: true },
    uploaded_at: { type: Date, default: Date.now }
});
const AlertsSchema = new Schema({
    // The user (Police/Family) who receives the alert
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // The photo that triggered the alert
    uploaded_photo: { type: Schema.Types.ObjectId, ref: 'UploadedPhoto', required: true },
    // The missing person report it matches
    missing_report: { type: Schema.Types.ObjectId, ref: 'MissingReport', required: true },
    is_verified: { type: Boolean, default: false },
    comments: { type: String },
    alert_time: { type: Date, default: Date.now }
});

module.exports = {
    Role: mongoose.model('Role', RoleSchema),
    User: mongoose.model('User', UserSchema),
    Request: mongoose.model('Request', RequestSchema),
    Notification: mongoose.model('Notification', NotificationSchema),
    MissingReport: mongoose.model('MissingReport', MissingReportSchema),
    UploadedPhoto: mongoose.model('UploadedPhoto', UploadedPhotoSchema),
    Alert: mongoose.model('Alert', AlertsSchema)
};