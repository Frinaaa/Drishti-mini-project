const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// --- Core Schemas (UserSchema, RoleSchema etc. remain unchanged) ---
const RoleSchema = new Schema({ role_name: { type: String, required: true, unique: true } });
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  gender: { type: String },
  role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  verification_status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
});

// --- Feature-Specific Schemas (Unchanged) ---
const MissingReportSchema = new Schema({ user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, person_name: { type: String, required: true }, gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true }, age: { type: Number, required: true }, last_seen: { type: String, required: true }, description: { type: String }, relationToReporter: { type: String }, reporterContact: { type: String }, photo_url: { type: String }, status: { type: String, default: 'Pending', required: true }, reported_at: { type: Date, default: Date.now } });
const UploadedPhotoSchema = new Schema({ uploader: { type: Schema.Types.ObjectId, ref: 'User', required: true }, location: { type: String, required: true }, image_url: { type: String, required: true }, uploaded_at: { type: Date, default: Date.now } });
const NGOReportSchema = new Schema({ ngo_user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, missing_report: { type: Schema.Types.ObjectId, ref: 'MissingReport', required: true }, comments: { type: String }, submitted_at: { type: Date, default: Date.now } });
const AlertsSchema = new Schema({ recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true }, uploaded_photo: { type: Schema.Types.ObjectId, ref: 'UploadedPhoto', required: true }, missing_report: { type: Schema.Types.ObjectId, ref: 'MissingReport', required: true }, is_verified: { type: Boolean, default: false }, comments: { type: String }, alert_time: { type: Date, default: Date.now } });

/*
 * ==================================================================
 * UPDATED REQUEST SCHEMA
 * ==================================================================
 */
const RequestSchema = new Schema({
  // Core Fields
  requestId: { type: String, unique: true, required: true },
  dateOfRequest: { type: Date, default: Date.now },
  status: { type: String, enum: ['Pending Review', 'Approved', 'Rejected'], default: 'Pending Review' },
  ngo_user: { type: Schema.Types.ObjectId, ref: 'User' }, // Stays optional
  
  // Detailed Fields from the Form
  ngoName: { type: String, required: true },
  registrationId: { type: String, required: true },
  description: { type: String, required: true },
  contactNumber: { type: String, required: true },
  email: { type: String, required: true },
  location: { type: String, required: true },
  documentPath: { type: String, required: true },

  // NEW: Field to store the hashed password from the registration form
  password: { type: String, required: true },
});

// Pre-save hook for generating requestId remains the same
RequestSchema.pre('save', async function (next) { if (this.isNew) { const lastRequest = await this.constructor.findOne({}, {}, { sort: { 'dateOfRequest': -1 } }); const nextId = lastRequest ? parseInt(lastRequest.requestId.split('-')[1]) + 1 : 1001; this.requestId = `REQ-${String(nextId).padStart(5, '0')}`; } next(); });

// --- Notification Schema (Unchanged) ---
const NotificationSchema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  is_read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

module.exports = {
  Role: mongoose.model('Role', RoleSchema),
  User: mongoose.model('User', UserSchema),
  MissingReport: mongoose.model('MissingReport', MissingReportSchema),
  UploadedPhoto: mongoose.model('UploadedPhoto', UploadedPhotoSchema),
  NGOReport: mongoose.model('NGOReport', NGOReportSchema),
  Alert: mongoose.model('Alert', AlertsSchema),
  Request: mongoose.model('Request', RequestSchema),
  Notification: mongoose.model('Notification', NotificationSchema)
};