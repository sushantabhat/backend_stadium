const mongoose = require('mongoose');

const staffShiftSchema = new mongoose.Schema({
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true,
  },
  gate: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    default: () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    },
  },
}, { timestamps: true });

staffShiftSchema.index({ staff: 1, date: 1 });
staffShiftSchema.index({ match: 1, gate: 1 });

module.exports = mongoose.model('StaffShift', staffShiftSchema);
