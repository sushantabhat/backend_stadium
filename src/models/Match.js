const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Match title is required'],
      trim: true,
      maxlength: 150,
    },
    teamA: {
      type: String,
      required: [true, 'Team A is required'],
      trim: true,
    },
    teamB: {
      type: String,
      required: [true, 'Team B is required'],
      trim: true,
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true,
    },
    matchDate: {
      type: Date,
      required: [true, 'Match date is required'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['upcoming', 'live', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pricing: {
      vip: { type: Number, required: true, min: 0 },
      premium: { type: Number, required: true, min: 0 },
      general: { type: Number, required: true, min: 0 },
    },
    seatLayout: {
      rows: { type: Number, required: true, min: 1, max: 30 },
      seatsPerRow: { type: Number, required: true, min: 1, max: 50 },
      vipRows: { type: Number, required: true, min: 0 },
      premiumRows: { type: Number, required: true, min: 0 },
    },
    totalSeats: {
      type: Number,
      default: 0,
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    teamALogo: {
      type: String,
      trim: true,
      default: '',
    },
    teamBLogo: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

matchSchema.index({ matchDate: 1, status: 1 });

module.exports = mongoose.model('Match', matchSchema);
