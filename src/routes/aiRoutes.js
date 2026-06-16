const express = require('express');
const aiController = require('../controllers/aiController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/recommendations/matches', aiController.getMatchRecommendations);
router.get('/matches/:id/recommend-seats', aiController.getSmartSeatRecommendations);
router.get('/matches/:id/dynamic-pricing', aiController.getDynamicPricingSuggestions);

module.exports = router;
