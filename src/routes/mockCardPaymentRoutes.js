const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { initiateCardPayment, confirmCardBooking } = require('../controllers/mockCardPaymentController');

router.post('/init', protect, initiateCardPayment);
router.post('/confirm', protect, confirmCardBooking);

module.exports = { mockCardPaymentRoutes: router };
