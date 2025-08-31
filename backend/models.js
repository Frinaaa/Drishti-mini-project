// models.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Role Schema - Defines user roles like 'Family', 'Police', 'NGO'
const RoleSchema = new Schema({
  role_name: { type: String, required: true, unique: true }
});

// Users Schema
// This model now ONLY stores core authentication and status information.
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique:true },
  password: { type: String, required: true },
  gender: { type: String },
  role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  // This field is the SINGLE SOURCE OF TRUTH for the NGO approval workflow.
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected','Frozen'], 
    default: 'Pending' // Default is 'Approved' for roles like Family/Police that don't need this workflow.
  }
});

// Request Schema
// This model now stores ALL the detailed information from the NGO's application form.
const RequestSchema = new Schema({
    requestId: { type: String, required: true, unique: true },
    // This is the crucial link back to the User document that was created.
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, 
    
    // --- All detailed NGO information is stored here, NOT in the User model ---
    ngoName: { type: String, required: true },
    registrationId: { type: String, required: true },
    description: { type: String, required: true },
    contactNumber: { type: String, required: true },
    email: { type: String, required: true }, // Stored for easy reference by police
    location: { type: String, required: true },
    documentPath: { type: String, required: true },
    
    // --- Administrative fields for the request itself ---
    dateOfRequest: { type: Date, default: Date.now },
    // This can store the ObjectId of the User who was created upon approval.
    ngo_user: { type: Schema.Types.ObjectId, ref: 'User' },

    // --- REMOVED ---
    // The status field has been removed to avoid redundancy.
    // The User model's 'status' is now the single source of truth.
    /*
    status: { 
        type: String, 
        enum: ['Pending Review', 'Approved', 'Rejected'], 
        default: 'Pending Review' 
    },
    */
});


// MissingReport Schema (Unchanged)
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

// Other Schemas (Unchanged)
const UploadedPhotoSchema = new Schema({
  uploader: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  location: { type: String, required: true },
  image_url: { type: String, required: true },
  uploaded_at: { type: Date, default: Date.now }
});
const NGOReportSchema = new Schema({
  ngo_user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  missing_report: { type: Schema.Types.ObjectId, ref: 'MissingReport', required: true },
  comments: { type: String },
  submitted_at: { type: Date, default: Date.now }
});
const AlertsSchema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploaded_photo: { type: Schema.Types.ObjectId, ref: 'UploadedPhoto', required: true },
  missing_report: { type: Schema.Types.ObjectId, ref: 'MissingReport', required: true },
  is_verified: { type: Boolean, default: false },
  comments: { type: String },
  alert_time: { type: Date, default: Date.now }
});


// Export Models
module.exports = {
  Role: mongoose.model('Role', RoleSchema),
  User: mongoose.model('User', UserSchema),
  // We name it 'Request' here so that `require('../models')` in requests.js can destructure it correctly.
  Request: mongoose.model('Request', RequestSchema),
  MissingReport: mongoose.model('MissingReport', MissingReportSchema),
  UploadedPhoto: mongoose.model('UploadedPhoto', UploadedPhotoSchema),
  NGOReport: mongoose.model('NGOReport', NGOReportSchema),
  Alert: mongoose.model('Alert', AlertsSchema)
};