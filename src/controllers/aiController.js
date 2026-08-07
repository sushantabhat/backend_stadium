const aiService = require('../services/aiService');



async function getMatchRecommendations(req, res, next) {
  try {
    const recommendations = await aiService.getMatchRecommendations(req.user.id);
    res.status(200).json({ recommendations });
  } catch (error) {
    next(error);
  }
}

async function getAttendancePrediction(req, res, next) {
  try {
    const { matchId } = req.params;
    const prediction = await aiService.predictAttendance(matchId);
    res.status(200).json(prediction);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMatchRecommendations,
  getAttendancePrediction,
};
