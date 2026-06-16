const express = require('express');
const bookingController = require('../controllers/bookingController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/lock', bookingController.lockSeats);
router.post('/unlock', bookingController.unlockSeats);
router.post('/confirm', bookingController.confirmBooking);
router.get('/my-bookings', bookingController.getMyBookings);

module.exports = router;
