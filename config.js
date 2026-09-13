const mongoose = require('mongoose');

// Connect to Main-tut database for user details
const mainConnection = mongoose.createConnection("mongodb://localhost:27017/Main-tut", { useNewUrlParser: true, useUnifiedTopology: true });
mainConnection.on('connected', () => console.log("Main-tut database is connected successfully"));
mainConnection.on('error', (err) => console.log("Main-tut database connection error:", err));

// Connect to Slots-tut database for booking details
const slotsConnection = mongoose.createConnection("mongodb://localhost:27017/Slots-tut", { useNewUrlParser: true, useUnifiedTopology: true });
slotsConnection.on('connected', () => console.log("Slots-tut database is connected successfully"));
slotsConnection.on('error', (err) => console.log("Slots-tut database connection error:", err));

// Create a schema for users in Main-tut
const LoginSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

// Schema for booking slots in Slots-tut
const SlotSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    timing: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    },
    totalCost: {
        type: Number,
        required: true
    },
    numberOfSeats: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        expires: '1d',
        default: Date.now
    }
});

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: { expires: '10m' } // OTP expires after 10 minutes
    }
});

// Define a schema for storing notes
const NoteSchema = new mongoose.Schema({
    user: { type: String, required: true },
    key: { type: String, required: true }, // Format: `${year}-${month}-${day}-${hour}`
    note: { type: String, required: true }
});

// Announcement Schema
const AnnouncementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    imageURL: {
        type: String,
        
    },
    createdBy: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

// Profile Schema
const ProfileSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true }, // Use username as the unique identifier
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: {
        line1: { type: String, default: '' },
        line2: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        country: { type: String, default: '' }
    },
    education: { type: String, default: '' }
});


const Profile = mainConnection.model('Profile', ProfileSchema);
// Announcement model
const Announcement = mainConnection.model('Announcement', AnnouncementSchema);

// Create a model for the notes
const Note = mainConnection.model('Note', NoteSchema);

const OTP = mainConnection.model('OTP', otpSchema);


// Create an index on field, date, and timing to ensure uniqueness
SlotSchema.index({ field: 1, date: 1, timing: 1 }, { unique: true });

const Slot = slotsConnection.model('Slot', SlotSchema);
const User = mainConnection.model('User', LoginSchema);

module.exports = { OTP, Slot, User, Note, Announcement, Profile };


