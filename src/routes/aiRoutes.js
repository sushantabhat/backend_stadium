const express = require('express');
const aiController = require('../controllers/aiController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/recommendations/matches', aiController.getMatchRecommendations);

// New endpoint for ML attendance prediction
router.get('/matches/:matchId/predict-attendance', authorize('admin'), aiController.getAttendancePrediction);

module.exports = router;
