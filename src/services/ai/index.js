/**
 * AI Services Index
 * 
 * Central export point for all AI-related modules.
 * 
 * Usage:
 *   const { featureExtractors, predictionEngines, modelRegistry } = require('./ai');
 * 
 *   // Extract features
 *   const userFeatures = await featureExtractors.extractUserFeatures(userId);
 *   
 *   // Get prediction
 *   const prediction = modelRegistry.predict('matchRecommendation', {
 *     userFeatures,
 *     matchFeatures,
 *   });
 */

const featureExtractors = require('./featureExtractors');
const predictionEngines = require('./predictionEngines');
const modelRegistry = require('./modelRegistry');

module.exports = {
  featureExtractors,
  predictionEngines,
  modelRegistry,
};
