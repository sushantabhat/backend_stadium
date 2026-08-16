const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  currentTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  isMarquee: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);
