const mongoose = require('mongoose');

const fraudLogSchema = new mongoose.Schema(
  {
    ticketCode: {
      type: String,
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
    },
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
    },
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Staff ID is required'],
    },
    reason: {
      type: String,
      enum: ['duplicate_scan', 'invalid_ticket', 'unauthorized_attempt'],
      required: [true, 'Fraud classification reason is required'],
    },
    details: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

fraudLogSchema.index({ timestamp: 1 });
fraudLogSchema.index({ reason: 1 });

module.exports = mongoose.model('FraudLog', fraudLogSchema);
