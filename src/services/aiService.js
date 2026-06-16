const mongoose = require('mongoose');
const Match = require('../models/Match');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const AIPrediction = require('../models/AIPrediction');
const { featureExtractors, modelRegistry } = require('./ai');

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * AI Dynamic Pricing Suggester (Enhanced)
 * 
 * Uses multi-factor analysis:
 * - Occupancy rate and hold rate
 * - Time before match
 * - Sales velocity
 * - Day of week patterns
 * 
 * Architecture: ML-ready with feature extraction and prediction engine
 */
async function getDynamicPricingSuggestions(matchId) {
  const startTime = Date.now();

  // Extract features
  const matchFeatures = await featureExtractors.extractMatchFeatures(matchId);
  if (!matchFeatures) {
    throw createHttpError('Match not found', 404);
  }

  const historicalFeatures = await featureExtractors.extractHistoricalFeatures(matchId);

  // Get prediction from model registry
  const prediction = modelRegistry.predict('dynamicPricing', {
    matchFeatures,
    historicalFeatures,
  });

  // Log prediction for analytics
  await AIPrediction.logPrediction({
    modelKey: 'dynamicPricing',
    modelVersion: '1.0.0',
    matchId,
    inputFeatures: { matchFeatures, historicalFeatures },
    prediction,
    confidence: prediction.confidence,
    predictionTime: Date.now() - startTime,
  });

  return {
    matchId,
    title: matchFeatures.title,
    currentPricing: prediction.currentPricing,
    suggestedPricing: prediction.suggestedPricing,
    occupancyRate: (matchFeatures.occupancyRate * 100).toFixed(1),
    holdRate: (matchFeatures.holdRate * 100).toFixed(1),
    multiplier: prediction.multiplier,
    demandLevel: prediction.demandLevel,
    factors: prediction.factors,
    confidence: prediction.confidence,
    // Backward compatibility
    occupancy: (matchFeatures.occupancyRate * 100).toFixed(1),
  };
}

/**
 * AI Smart Seat Recommendation (Enhanced)
 * 
 * Uses multi-factor analysis:
 * - Center proximity
 * - Row preference (front rows)
 * - User's category preferences
 * - Price value scoring
 * - Group potential
 * 
 * Architecture: ML-ready with feature extraction and prediction engine
 */
async function getSmartSeatRecommendations(matchId, category, count = 2) {
  const startTime = Date.now();

  // Extract features
  const matchFeatures = await featureExtractors.extractMatchFeatures(matchId);
  if (!matchFeatures) {
    throw createHttpError('Match not found', 404);
  }

  const seatFeatures = await featureExtractors.extractSeatFeatures(matchId, category);
  if (!seatFeatures || seatFeatures.seats.length === 0) {
    return [];
  }

  // Note: userFeatures would be passed in a real implementation
  // For now, we use match-based features only
  const userFeatures = null;

  // Get prediction from model registry
  const recommendations = modelRegistry.predict('smartSeat', {
    seatFeatures,
    userFeatures,
    matchFeatures,
  });

  // Log prediction
  await AIPrediction.logPrediction({
    modelKey: 'smartSeat',
    modelVersion: '1.0.0',
    matchId,
    inputFeatures: { seatFeatures, category, count },
    prediction: { recommendations: recommendations.length },
    confidence: 0.8,
    predictionTime: Date.now() - startTime,
  });

  // Return formatted results (backward compatible)
  return recommendations.slice(0, Number(count)).map(rec => ({
    _id: rec.seatId,
    seatLabel: rec.seatLabel,
    row: rec.row,
    number: rec.number,
    category: rec.category,
    price: rec.price,
    score: rec.score,
    explanation: rec.explanation,
  }));
}

/**
 * AI Match Recommendation (Enhanced)
 * 
 * Uses multi-factor scoring:
 * - Team preference (+100)
 * - Category match (+30)
 * - Booking frequency (+20)
 * - Recency bonus (+15)
 * - Occupancy trend (+25)
 * - Venue preference (+10)
 * 
 * Architecture: ML-ready with feature extraction and prediction engine
 */
async function getMatchRecommendations(userId) {
  const startTime = Date.now();

  // Extract user features
  const userFeatures = await featureExtractors.extractUserFeatures(userId);

  // Find all upcoming or live matches
  const upcomingMatches = await Match.find({
    status: { $in: ['upcoming', 'live'] },
  }).lean();

  if (upcomingMatches.length === 0) {
    return [];
  }

  const recommendations = [];

  // Score each match
  for (const match of upcomingMatches) {
    const matchFeatures = await featureExtractors.extractMatchFeatures(match._id);
    if (!matchFeatures) continue;

    // Get prediction from model registry
    const prediction = modelRegistry.predict('matchRecommendation', {
      userFeatures,
      matchFeatures,
    });

    recommendations.push({
      ...match,
      score: prediction.score,
      reason: prediction.reason,
      allReasons: prediction.allReasons,
      factors: prediction.factors,
      stats: {
        total: matchFeatures.totalSeats,
        available: matchFeatures.availableSeats,
        booked: matchFeatures.bookedSeats,
      },
    });
  }

  // Sort by score and return top 5
  const topRecommendations = recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Log predictions
  await AIPrediction.logPrediction({
    modelKey: 'matchRecommendation',
    modelVersion: '1.0.0',
    userId,
    inputFeatures: { userFeatures, matchCount: upcomingMatches.length },
    prediction: { topScores: topRecommendations.map(r => r.score) },
    confidence: 0.85,
    predictionTime: Date.now() - startTime,
  });

  return topRecommendations;
}

module.exports = {
  getDynamicPricingSuggestions,
  getSmartSeatRecommendations,
  getMatchRecommendations,
};
