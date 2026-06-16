const express = require('express');
const ticketController = require('../controllers/ticketController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(protect);

// Fan route
router.get('/my-tickets', ticketController.getMyTickets);

// Staff/Admin routes
router.post('/verify', authorize('staff', 'admin'), ticketController.verifyTicket);
router.get('/scan-history', authorize('staff', 'admin'), ticketController.getStaffScanHistory);

module.exports = router;
