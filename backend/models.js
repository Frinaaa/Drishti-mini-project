// backend/models.js

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
    registrationId: { type: String, required: true },
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

module.exports = {
  Role: mongoose.model('Role', RoleSchema),
  User: mongoose.model('User', UserSchema),
  Request: mongoose.model('Request', RequestSchema),
  Notification: mongoose.model('Notification', NotificationSchema),
};