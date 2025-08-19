// models.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Role Schema - Defines user roles like 'Family', 'Police', 'NGO'
const RoleSchema = new Schema({
  role_name: { type: String, required: true, unique: true }
});

// Users Schema
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique:true },
  password: { type: String, required: true },
  // ADDED: The gender field from code2
  gender: { type: String },
  // Reference to a document in the 'Role' collection
  role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  is_verified: { type: Boolean, default: false }
});

// MissingReport Schema
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

// NGOReport Schema
const NGOReportSchema = new Schema({
  // The NGO user who is filing a follow-up
  ngo_user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // The original missing person report this is related to
  missing_report: { type: Schema.Types.ObjectId, ref: 'MissingReport', required: true },
  comments: { type: String },
  submitted_at: { type: Date, default: Date.now }
});

// Alerts Schema
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

// Export Models
module.exports = {
  Role: mongoose.model('Role', RoleSchema),
  User: mongoose.model('User', UserSchema),
  MissingReport: mongoose.model('MissingReport', MissingReportSchema),
  UploadedPhoto: mongoose.model('UploadedPhoto', UploadedPhotoSchema),
  NGOReport: mongoose.model('NGOReport', NGOReportSchema),
  Alert: mongoose.model('Alert', AlertsSchema)
};