const mongoose = require('mongoose');

const stadiumSectionSchema = new mongoose.Schema(
  {
    sectionId: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['platinum', 'gold', 'silver', 'bronze', 'general', 'supporters', 'category1', 'category2', 'category3', 'category4'],
      required: true,
    },
    label: { type: String, required: true, trim: true },
    color: { type: String, default: '#888888' },
    polygon: { type: String, default: '' },
    labelX: { type: Number, default: 0 },
    labelY: { type: Number, default: 0 },
    pricePerTicket: { type: Number, required: true, min: 0 },
    totalSeats: { type: Number, required: true, min: 1 },
    availableSeats: { type: Number, default: 0 },
    rows: [{ type: String }],
    gate: { type: String, default: '' },
  },
  { _id: false }
);

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
      type: Map,
      of: Number,
      default: {},
    },
    stadiumSections: {
      type: [stadiumSectionSchema],
      default: [],
    },
    seatLayout: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
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
