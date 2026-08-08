const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['fraud_duplicate', 'fraud_fake', 'tech_api', 'tech_system', 'ops_complaint', 'other']
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  ticketCode: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional to allow anonymous or system reports if needed
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Resolved'],
    default: 'Open'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Incident', incidentSchema);
