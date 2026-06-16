const mongoose = require('mongoose');

/**
 * AI Prediction Model
 * 
 * Stores AI predictions for:
 * - Audit trail and analysis
 * - Model performance tracking
 * - Future ML training data
 * - Debugging and monitoring
 */
const aiPredictionSchema = new mongoose.Schema(
  {
    // Prediction metadata
    modelKey: {
      type: String,
      required: true,
      enum: ['matchRecommendation', 'smartSeat', 'dynamicPricing', 'fraudDetection'],
      index: true,
    },
    modelVersion: {
      type: String,
      required: true,
    },
    modelType: {
      type: String,
      default: 'rule-based',
    },

    // Context
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
    },
    ticketCode: {
      type: String,
    },

    // Input features (stored for ML training later)
    inputFeatures: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // Prediction output
    prediction: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },

    // Performance tracking
    wasCorrect: {
      type: Boolean,
    },
    feedback: {
      type: String,
    },

    // Timing
    predictionTime: {
      type: Number, // milliseconds
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
aiPredictionSchema.index({ modelKey: 1, timestamp: -1 });
aiPredictionSchema.index({ userId: 1, modelKey: 1 });
aiPredictionSchema.index({ matchId: 1, modelKey: 1 });
aiPredictionSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 days TTL

// Static method to log a prediction
aiPredictionSchema.statics.logPrediction = async function(data) {
  try {
    return await this.create({
      modelKey: data.modelKey,
      modelVersion: data.modelVersion,
      modelType: data.modelType || 'rule-based',
      userId: data.userId,
      matchId: data.matchId,
      ticketCode: data.ticketCode,
      inputFeatures: data.inputFeatures,
      prediction: data.prediction,
      confidence: data.confidence,
      predictionTime: data.predictionTime,
    });
  } catch (error) {
    // Silently fail - prediction logging should not break the app
    console.error('[AIPrediction] Failed to log prediction:', error.message);
    return null;
  }
};

// Static method to get prediction stats
aiPredictionSchema.statics.getStats = async function(modelKey, days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const stats = await this.aggregate([
    {
      $match: {
        modelKey,
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        totalPredictions: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' },
        avgPredictionTime: { $avg: '$predictionTime' },
      },
    },
  ]);

  return stats[0] || {
    totalPredictions: 0,
    avgConfidence: 0,
    avgPredictionTime: 0,
  };
};

module.exports = mongoose.model('AIPrediction', aiPredictionSchema);
