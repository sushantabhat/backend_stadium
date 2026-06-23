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
    status: {
      type: String,
      enum: ['open', 'resolved', 'escalated'],
      default: 'open',
    },
    resolution: {
      type: String,
      enum: ['dismissed', 'allowed', ''],
      default: '',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    notes: {
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
fraudLogSchema.index({ status: 1 });

module.exports = mongoose.model('FraudLog', fraudLogSchema);
