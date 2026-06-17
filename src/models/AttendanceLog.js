const mongoose = require('mongoose');

const attendanceLogSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: [true, 'Ticket ID is required'],
    },
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: [true, 'Match ID is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seat',
      required: [true, 'Seat ID is required'],
    },
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Staff ID is required'],
    },
    entryTime: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

attendanceLogSchema.index({ match: 1 });
attendanceLogSchema.index({ scannedBy: 1 });
attendanceLogSchema.index({ entryTime: 1 });

module.exports = mongoose.model('AttendanceLog', attendanceLogSchema);
