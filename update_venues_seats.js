require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('./src/models/Venue');

const DEFAULT_SECTIONS = [
  { sectionId: 'North', category: 'platinum', label: 'North Stand', color: '#ffb300', totalSeats: 5000, gate: 'A', pricePerTicket: 5000, polygon: 'M110.0,67.8 A140,140 0 0,1 290.0,67.8 L257.9,106.1 A90,90 0 0,0 142.1,106.1 Z' },
  { sectionId: 'South', category: 'gold', label: 'South Stand', color: '#1e88e5', totalSeats: 8000, gate: 'B', pricePerTicket: 3000, polygon: 'M110.0,282.2 A140,140 0 0,0 290.0,282.2 L257.9,243.9 A90,90 0 0,1 142.1,243.9 Z' },
  { sectionId: 'East', category: 'silver', label: 'East Stand', color: '#43a047', totalSeats: 7000, gate: 'C', pricePerTicket: 2000, polygon: 'M307.2,85.0 A140,140 0 0,1 307.2,265.0 L268.9,232.9 A90,90 0 0,0 268.9,117.2 Z' },
  { sectionId: 'West', category: 'general', label: 'West Stand', color: '#e53935', totalSeats: 5000, gate: 'D', pricePerTicket: 500, polygon: 'M92.8,265.0 A140,140 0 0,1 92.8,85.0 L131.1,117.2 A90,90 0 0,0 131.1,232.9 Z' }
];

async function updateVenues() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-stadium');
    const venues = await Venue.find();
    for (const v of venues) {
      v.stadiumSections = DEFAULT_SECTIONS;
      v.gates = ['A', 'B', 'C', 'D'];
      await v.save();
    }
    console.log('Updated all venues with sections and seats.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating venues:', error);
    process.exit(1);
  }
}

updateVenues();
