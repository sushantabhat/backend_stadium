const express = require('express');
const adminController = require('../controllers/adminController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'supervisor'));

router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/analytics', adminController.getAnalytics);
router.get('/tickets', adminController.getAllTickets);
router.get('/fraud-logs', adminController.getFraudLogs);

module.exports = router;
