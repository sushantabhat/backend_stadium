const express = require('express');
const adminController = require('../controllers/adminController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/analytics', adminController.getAnalytics);
router.get('/fraud-logs', adminController.getFraudLogs);

module.exports = router;
