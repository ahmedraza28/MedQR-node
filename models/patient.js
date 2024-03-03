const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    mobileNumber: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    resetPasswordOTP: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    }
});

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
