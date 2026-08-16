const express = require('express');
const shiftController = require('../controllers/shiftController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(protect);

// Staff can get their own active shift
router.get('/my-active', shiftController.getMyActiveShift);
router.get('/my-all', shiftController.getMyShifts);

// Gate stats — anyone with auth can view
router.get('/gate-stats/:matchId', shiftController.getGateStats);

// Admin/supervisor CRUD
router.get('/', authorize('admin', 'supervisor'), shiftController.getShifts);
router.get('/:id', authorize('admin', 'supervisor'), shiftController.getShiftById);
router.post('/', authorize('admin', 'supervisor'), shiftController.createShift);
router.put('/:id', authorize('admin', 'supervisor'), shiftController.updateShift);
router.delete('/:id', authorize('admin', 'supervisor'), shiftController.deleteShift);

module.exports = router;
