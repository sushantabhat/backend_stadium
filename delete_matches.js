const mongoose = require('mongoose');
require('dotenv').config();
const Match = require('./src/models/Match');
const Seat = require('./src/models/Seat');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-stadium');
    console.log('Connected to DB');
    const matchCount = await Match.countDocuments();
    await Match.deleteMany({});
    await Seat.deleteMany({});
    console.log(`Successfully deleted ${matchCount} matches and all their seats.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
