const aiService = require('../services/aiService');

async function getDynamicPricingSuggestions(req, res, next) {
  try {
    const suggestions = await aiService.getDynamicPricingSuggestions(req.params.id);
    res.status(200).json({ suggestions });
  } catch (error) {
    next(error);
  }
}

async function getSmartSeatRecommendations(req, res, next) {
  try {
    const { category, count } = req.query;
    const parsedCount = Math.max(1, Math.min(Number(count) || 2, 10));
    const recommendations = await aiService.getSmartSeatRecommendations(
      req.params.id,
      category || 'general',
      parsedCount
    );
    res.status(200).json({ recommendations });
  } catch (error) {
    next(error);
  }
}

async function getMatchRecommendations(req, res, next) {
  try {
    const recommendations = await aiService.getMatchRecommendations(req.user.id);
    res.status(200).json({ recommendations });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDynamicPricingSuggestions,
  getSmartSeatRecommendations,
  getMatchRecommendations,
};
