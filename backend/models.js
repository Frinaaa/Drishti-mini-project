// backend/models.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Defines user roles like 'Family', 'Police', 'NGO'
const RoleSchema = new Schema({
role_name: { type: String, required: true, unique: true }
});

// Defines the documents in the 'users' collection
const UserSchema = new Schema({
name: { type: String, required: true },
email: { type: String, required: true, unique: true },
password: { type: String, required: true },
role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
profile_photo: { type: String, default: null },
status: {
type: String,
enum: ['Active', 'Frozen', 'Blocked'],
default: 'Active'
},
});

// Defines the documents in the 'requests' collection
const RequestSchema = new Schema({
requestId: { type: String, required: true, unique: true },
ngoName: { type: String, required: true },
registrationId: { type: String, required: true },
description: { type: String, required: true },
contactNumber: { type: String, required: true },
email: { type: String, required: true },
location: { type: String, required: true },
documentPath: { type: String, required: true },
proposedPassword: { type: String, required: true },
dateOfRequest: { type: Date, default: Date.now },
status: {
type: String,
enum: ['Pending', 'Approved', 'Rejected'],
default: 'Pending'
},
approvedUser: { type: Schema.Types.ObjectId, ref: 'User' },
});

// Defines the documents in the 'notifications' collection
const NotificationSchema = new Schema({
recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
message: { type: String, required: true },
is_read: { type: Boolean, default: false },
created_at: { type: Date, default: Date.now }
});

// Defines the documents in the 'missingreports' collection
const MissingReportSchema = new Schema({
user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
person_name: { type: String, required: true },
gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
age: { type: Number, required: true },
last_seen: { type: String, required: true },
description: { type: String },
relationToReporter: { type: String },
reporterContact: { type: String },
familyEmail: { type: String },
photo_url: { type: String },
status: { type: String, default: 'Pending', required: true },
reported_at: { type: Date, default: Date.now }
});

// Defines the documents in the 'uploadedphotos' collection
const UploadedPhotoSchema = new Schema({
uploader: { type: Schema.Types.ObjectId, ref: 'User', required: true },
location: { type: String, required: true },
image_url: { type: String, required: true },
uploaded_at: { type: Date, default: Date.now }
});

// Defines the documents in the 'alerts' collection
const AlertsSchema = new Schema({
recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
uploaded_photo: { type: Schema.Types.ObjectId, ref: 'UploadedPhoto', required: true },
missing_report: { type: Schema.Types.ObjectId, ref: 'MissingReport', required: true },
is_verified: { type: Boolean, default: false },
comments: { type: String },
alert_time: { type: Date, default: Date.now }
});

// --- THIS IS THE CORRECTED EXPORT BLOCK ---
// The duplicate 'Notification' has been removed.
module.exports = {
Role: mongoose.model('Role', RoleSchema),
User: mongoose.model('User', UserSchema),
Request: mongoose.model('Request', RequestSchema),
Notification: mongoose.model('Notification', NotificationSchema),
MissingReport: mongoose.model('MissingReport', MissingReportSchema),
UploadedPhoto: mongoose.model('UploadedPhoto', UploadedPhotoSchema),
Alert: mongoose.model('Alert', AlertsSchema),
};