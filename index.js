const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const patientRoutes = require('./routes/patientRoutes');
const medicalRecordRoutes = require('./routes/medicalRecordRoutes');
const database = require('./config/database');


const app = express();

// Middleware
app.use(bodyParser.json());

// Routes
app.use('/api/patients', patientRoutes);
app.use('/api/medical-records', medicalRecordRoutes); // Include medical record routes

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});