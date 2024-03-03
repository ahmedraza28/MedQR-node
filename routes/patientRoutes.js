const express = require('express');
const router = express.Router();
const userController = require('../controllers/patientController');

router.post('/signup', userController.signup);
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.post('/verify-otp', userController.verifyOTPAndChangePassword);

module.exports = router;
