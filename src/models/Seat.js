const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema(
  {
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
    },
    seatLabel: {
      type: String,
      required: true,
      trim: true,
    },
    row: {
      type: String,
      required: true,
      trim: true,
    },
    number: {
      type: Number,
      required: true,
      min: 1,
    },
    category: {
      type: String,
      enum: ['vip', 'premium', 'general'],
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['available', 'locked', 'booked'],
      default: 'available',
    },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

seatSchema.index({ match: 1, seatLabel: 1 }, { unique: true });
seatSchema.index({ match: 1, status: 1 });
seatSchema.index({ match: 1, category: 1 });

module.exports = mongoose.model('Seat', seatSchema);
