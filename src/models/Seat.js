const mongoose = require('mongoose');

const SEAT_CATEGORIES = ['category1', 'category2', 'category3', 'category4', 'vip', 'supporters'];

const seatSchema = new mongoose.Schema(
  {
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
    },
    sectionId: {
      type: String,
      trim: true,
      default: null,
    },
    gate: {
      type: String,
      trim: true,
      default: '',
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
      enum: SEAT_CATEGORIES,
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
seatSchema.index({ match: 1, sectionId: 1 });

module.exports = mongoose.model('Seat', seatSchema);
module.exports.SEAT_CATEGORIES = SEAT_CATEGORIES;
