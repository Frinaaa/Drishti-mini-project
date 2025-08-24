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
  gender: { type: String },
  role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  is_verified: { type: Boolean, default: false }
});

// MissingReport Schema
const MissingReportSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  person_name: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  age: { type: Number, required: true },
  last_seen: { type: String, required: true },
  description: { type: String },
  relationToReporter: { type: String },
  reporterContact: { type: String },
  photo_url: { type: String },
  status: { type: String, default: 'Pending', required: true },
  reported_at: { type: Date, default: Date.now }
});

// UploadedPhoto Schema
const UploadedPhotoSchema = new Schema({
  uploader: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  location: { type: String, required: true },
  image_url: { type: String, required: true },
  uploaded_at: { type: Date, default: Date.now }
});

// NGOReport Schema
const NGOReportSchema = new Schema({
  ngo_user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  missing_report: { type: Schema.Types.ObjectId, ref: 'MissingReport', required: true },
  comments: { type: String },
  submitted_at: { type: Date, default: Date.now }
});

// Alerts Schema
const AlertsSchema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploaded_photo: { type: Schema.Types.ObjectId, ref: 'UploadedPhoto', required: true },
  missing_report: { type: Schema.Types.ObjectId, ref: 'MissingReport', required: true },
  is_verified: { type: Boolean, default: false },
  comments: { type: String },
  alert_time: { type: Date, default: Date.now }
});

/*
 * ==================================================================
 * ADDED: The new schema for handling requests from NGOs to Police.
 * WHY: To create a dedicated data model for storing, tracking, and 
 * managing all aspects of a request, including its status, associated 
 * document, and auto-generated ID. This model is essential for the 
 * new feature's functionality.
 * ==================================================================
 */
const RequestSchema = new Schema({
  // Auto-generated unique ID like REQ-00001
  requestId: {
    type: String,
    unique: true,
    required: true,
  },
  // Automatically set to the current date on creation
  dateOfRequest: {
    type: Date,
    default: Date.now,
  },
  // Location provided by the NGO
  location: {
    type: String,
    required: true,
  },
  // Contact info provided by the NGO
  contact: {
    type: String,
    required: true,
  },
  // Path to the saved document on the server (e.g., 'uploads/1678886400000-document.pdf')
  documentPath: {
    type: String, // Path will be null if no document is uploaded
  },
  // Status of the request, managed by police
  status: {
    type: String,
    enum: ['Pending Review', 'Approved', 'Rejected'],
    default: 'Pending Review',
  },
  // Reference to the NGO user who submitted the request
  ngo_user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Pre-save hook to generate the custom, human-readable requestId before saving
RequestSchema.pre('save', async function (next) {
  if (this.isNew) {
    const lastRequest = await this.constructor.findOne({}, {}, { sort: { 'dateOfRequest': -1 } });
    const nextId = lastRequest ? parseInt(lastRequest.requestId.split('-')[1]) + 1 : 1001; // Start from 1001
    this.requestId = `REQ-${String(nextId).padStart(5, '0')}`;
  }
  next();
});


// Export Models
module.exports = {
  Role: mongoose.model('Role', RoleSchema),
  User: mongoose.model('User', UserSchema),
  MissingReport: mongoose.model('MissingReport', MissingReportSchema),
  UploadedPhoto: mongoose.model('UploadedPhoto', UploadedPhotoSchema),
  NGOReport: mongoose.model('NGOReport', NGOReportSchema),
  Alert: mongoose.model('Alert', AlertsSchema),
  // ADDED: Export the new Request model
  Request: mongoose.model('Request', RequestSchema)
};