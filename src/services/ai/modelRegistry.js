/**
 * MODEL REGISTRY
 * 
 * Centralized registry for AI/ML models.
 * Currently manages rule-based engines.
 * Can be extended to manage trained ML models.
 * 
 * DESIGN:
 * - Models are registered by name and version
 * - Each model has a predict() method
 * - Models can be hot-swapped without restarting
 * - Supports fallback to default model
 */

const predictionEngines = require('./predictionEngines');

// Model registry storage
const modelRegistry = new Map();

// Default model configuration
const DEFAULT_MODELS = {
  matchRecommendation: {
    name: 'match-recommendation',
    version: '1.0.0',
    type: 'rule-based',
    engine: predictionEngines.predictMatchRecommendation,
    description: 'Rule-based match recommendation using user history and match features',
  },
  smartSeat: {
    name: 'smart-seat',
    version: '1.0.0',
    type: 'rule-based',
    engine: predictionEngines.predictSmartSeats,
    description: 'Rule-based smart seat recommendation using proximity and preferences',
  },
  dynamicPricing: {
    name: 'dynamic-pricing',
    version: '1.0.0',
    type: 'rule-based',
    engine: predictionEngines.predictDynamicPricing,
    description: 'Rule-based dynamic pricing using demand and time factors',
  },
  fraudDetection: {
    name: 'fraud-detection',
    version: '1.0.0',
    type: 'rule-based',
    engine: predictionEngines.predictFraud,
    description: 'Rule-based fraud detection using behavioral analysis',
  },
};

/**
 * Initialize the model registry with default models
 */
function initializeRegistry() {
  for (const [key, config] of Object.entries(DEFAULT_MODELS)) {
    modelRegistry.set(key, {
      ...config,
      loadedAt: new Date(),
      predictions: 0,
      lastUsed: null,
    });
  }
  console.log(`[ModelRegistry] Initialized ${modelRegistry.size} models`);
}

/**
 * Get a model by key
 * @param {string} modelKey - Model key (e.g., 'matchRecommendation')
 * @returns {Object} Model object with predict method
 */
function getModel(modelKey) {
  const model = modelRegistry.get(modelKey);
  if (!model) {
    throw new Error(`Model not found: ${modelKey}`);
  }
  return model;
}

/**
 * Get prediction from a model
 * @param {string} modelKey - Model key
 * @param {Object} features - Extracted features
 * @returns {Object} Prediction result
 */
function predict(modelKey, features) {
  const model = getModel(modelKey);

  // Update usage stats
  model.predictions++;
  model.lastUsed = new Date();

  // Call the model's engine
  return model.engine(features);
}

/**
 * Register a new model (for future ML integration)
 * @param {string} modelKey - Model key
 * @param {Object} config - Model configuration
 */
function registerModel(modelKey, config) {
  if (!config.name || !config.version || !config.engine) {
    throw new Error('Model config must include name, version, and engine');
  }

  modelRegistry.set(modelKey, {
    ...config,
    loadedAt: new Date(),
    predictions: 0,
    lastUsed: null,
  });

  console.log(`[ModelRegistry] Registered model: ${config.name} v${config.version}`);
}

/**
 * Replace a model (hot-swap)
 * @param {string} modelKey - Model key
 * @param {Object} newConfig - New model configuration
 */
function replaceModel(modelKey, newConfig) {
  const existing = modelRegistry.get(modelKey);
  if (!existing) {
    throw new Error(`Cannot replace: Model not found: ${modelKey}`);
  }

  // Keep old version info
  const oldVersion = existing.version;

  // Replace with new model
  modelRegistry.set(modelKey, {
    ...newConfig,
    loadedAt: new Date(),
    predictions: 0,
    lastUsed: null,
    previousVersion: oldVersion,
  });

  console.log(`[ModelRegistry] Replaced ${modelKey}: v${oldVersion} -> v${newConfig.version}`);
}

/**
 * Get model statistics
 * @returns {Object} Registry statistics
 */
function getStats() {
  const stats = {
    totalModels: modelRegistry.size,
    models: {},
  };

  for (const [key, model] of modelRegistry.entries()) {
    stats.models[key] = {
      name: model.name,
      version: model.version,
      type: model.type,
      predictions: model.predictions,
      lastUsed: model.lastUsed,
      loadedAt: model.loadedAt,
    };
  }

  return stats;
}

/**
 * Get all registered model keys
 * @returns {string[]} Array of model keys
 */
function getModelKeys() {
  return Array.from(modelRegistry.keys());
}

// Initialize on module load
initializeRegistry();

module.exports = {
  getModel,
  predict,
  registerModel,
  replaceModel,
  getStats,
  getModelKeys,
  initializeRegistry,
};
