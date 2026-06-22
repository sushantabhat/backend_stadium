const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { initiateEsewaPayment, verifyEsewaPayment } = require('../controllers/paymentController');

router.post('/esewa/init', protect, initiateEsewaPayment);
router.post('/esewa/verify', protect, verifyEsewaPayment);

module.exports = { paymentRoutes: router };
