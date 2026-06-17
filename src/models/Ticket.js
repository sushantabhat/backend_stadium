const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
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
    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seat',
      required: [true, 'Seat ID is required'],
    },
    ticketCode: {
      type: String,
      required: [true, 'Ticket verification code is required'],
      unique: true,
    },
    status: {
      type: String,
      enum: ['active', 'used'],
      default: 'active',
    },
    usedAt: {
      type: Date,
    },
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

ticketSchema.index({ match: 1 });
ticketSchema.index({ user: 1 });
ticketSchema.index({ status: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
