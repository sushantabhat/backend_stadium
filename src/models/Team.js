const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  shortName: { type: String, required: true, trim: true, uppercase: true },
  logoUrl: {
    type: String,
    default: '',
  },
  globalRank: {
    type: Number,
    default: null, // Null for unranked/domestic teams
  },
  homeCity: {
    type: String,
    default: null, // e.g. "Kathmandu"
  }
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);
