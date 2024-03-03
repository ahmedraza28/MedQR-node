const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    contentType: {
        type: String,
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    length: {
        type: Number,
        required: true
    },
    data: {
        type: Buffer,
        required: true
    }
});

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

module.exports = MedicalRecord;
