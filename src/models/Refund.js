const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: [true, 'Match ID is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Refund amount is required'],
      min: [0, 'Refund amount cannot be negative'],
    },
    transactionId: {
      type: String,
      default: null,
    },
    refundId: {
      type: String,
      required: true,
      unique: true,
    },
    gatewayRefundId: {
      type: String,
      default: null,
    },
    reason: {
      type: String,
      enum: ['match_cancelled', 'user_cancelled', 'admin'],
      default: 'match_cancelled',
    },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing',
    },
    estimatedSettlementDate: {
      type: Date,
      default: null,
    },
    settledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Refund', refundSchema);
