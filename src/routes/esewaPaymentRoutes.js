const express = require('express');
const router = express.Router();
const esewaPaymentController = require('../controllers/esewaPaymentController');
const { protect } = require('../middlewares/authMiddleware');

// Public GET route - serves HTML auto-submit form (no auth needed, UUID acts as token)
router.get('/form/:uuid', esewaPaymentController.getEsewaForm);

router.post('/initiate', protect, esewaPaymentController.initiateEsewaPayment);
router.post('/verify', protect, esewaPaymentController.verifyEsewaPayment);

module.exports = router;
