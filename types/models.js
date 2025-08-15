// models.js
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Role Schema
const RoleSchema = new Schema({
  role_id: { type: Number, required: true, unique: true },
  role_name: { type: String, required: true }
});

// Users Schema
const UserSchema = new Schema({
  user_id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role_id: { type: Number, ref: 'Role', required: true },
  is_verified: { type: Boolean, default: false }
});

// MissingReport Schema
const MissingReportSchema = new Schema({
  report_id: { type: Number, required: true, unique: true },
  user_id: { type: Number, ref: 'User', required: true },
  person_name: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  age: { type: Number, required: true },
  last_seen: { type: String, required: true },
  photo_url: { type: String },
  status: { type: String, required: true },
  reported_at: { type: Date, default: Date.now }
});

// UploadedPhoto Schema
const UploadedPhotoSchema = new Schema({
  photo_id: { type: Number, required: true, unique: true },
  user_id: { type: Number, ref: 'User', required: true },
  location: { type: String, required: true },
  image_url: { type: String, required: true },
  uploaded_at: { type: Date, default: Date.now }
});

// NGOReport Schema
const NGOReportSchema = new Schema({
  ngo_report_id: { type: Number, required: true, unique: true },
  user_id: { type: Number, ref: 'User', required: true },
  report_id: { type: Number, ref: 'MissingReport', required: true },
  comments: { type: String },
  submitted_at: { type: Date, default: Date.now }
});

// Alerts Schema
const AlertsSchema = new Schema({
  alert_id: { type: Number, required: true, unique: true },
  user_id: { type: Number, ref: 'User', required: true },
  photo_id: { type: Number, ref: 'UploadedPhoto', required: true },
  report_id: { type: Number, ref: 'MissingReport', required: true },
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
