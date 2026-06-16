const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
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
    seats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seat',
        required: [true, 'At least one seat is required'],
      },
    ],
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'confirmed',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
