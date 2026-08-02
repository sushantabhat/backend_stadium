require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('./src/models/Venue');

async function fixGates() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-stadium');
  
  const venues = await Venue.find();
  for (let venue of venues) {
    if (!venue.gates || venue.gates.length === 0) {
      venue.gates = ['Gate 1', 'Gate 2', 'VIP Gate'];
      await venue.save();
      console.log(`Added default gates to venue: ${venue.name}`);
    }
  }
  console.log("Done");
  process.exit(0);
}

fixGates();
