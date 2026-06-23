const mongoose = require('mongoose');

const stadiumSectionSchema = new mongoose.Schema({
  sectionId: { type: String, required: true },
  category: { type: String, required: true },
  label: { type: String, default: '' },
  color: { type: String, default: '#888888' },
  polygon: { type: String, default: '' },
  pricePerTicket: { type: Number, default: 0 },
  totalSeats: { type: Number, default: 0 },
  rows: [{ type: String }],
}, { _id: false });

const venueSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  location: { type: String, default: '' },
  pricing: { type: Map, of: Number, default: {} },
  stadiumSections: { type: [stadiumSectionSchema], default: [] },
  seatLayout: { type: mongoose.Schema.Types.Mixed, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

venueSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Venue', venueSchema);
