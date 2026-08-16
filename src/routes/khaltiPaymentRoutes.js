const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { initiateKhaltiPayment, verifyKhaltiPayment } = require('../controllers/khaltiPaymentController');

router.post('/init', protect, initiateKhaltiPayment);
router.post('/verify', protect, verifyKhaltiPayment);

module.exports = { khaltiPaymentRoutes: router };
