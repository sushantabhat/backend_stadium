const express = require('express');
const ticketController = require('../controllers/ticketController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(protect);

// Get my tickets
router.get('/my-tickets', protect, ticketController.getMyTickets);

// Verify ticket (staff/supervisor only)
router.post('/verify', authorize('staff', 'supervisor', 'admin'), ticketController.verifyTicket);

// Deny ticket and cancel it (supervisor only)
router.post('/deny', authorize('supervisor', 'admin'), ticketController.denyTicket);

// Lookup ticket without verifying (supervisor only)
router.get('/lookup/:ticketCode', authorize('supervisor', 'admin'), ticketController.lookupTicket);

// Staff scan history
router.get('/scan-history', authorize('staff', 'supervisor', 'admin'), ticketController.getStaffScanHistory);

module.exports = router;
