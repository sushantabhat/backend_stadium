const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Team = require('../src/models/Team');
const Player = require('../src/models/Player');

dotenv.config({ path: '.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-stadium';

async function seedPlayers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // Update Home Cities
    await Team.updateOne({ name: 'Kathmandu Gurkhas' }, { $set: { homeCity: 'Kathmandu' } });
    await Team.updateOne({ name: 'Chitwan Rhinos' }, { $set: { homeCity: 'Chitwan' } });
    await Team.updateOne({ name: 'Janakpur Bolts' }, { $set: { homeCity: 'Janakpur' } });
    await Team.updateOne({ name: 'Pokhara Avengers' }, { $set: { homeCity: 'Pokhara' } });
    await Team.updateOne({ name: 'Biratnagar Kings' }, { $set: { homeCity: 'Biratnagar' } });

    console.log('Updated Team Home Cities.');

    // Clear old players
    await Player.deleteMany({});
    console.log('Cleared existing players.');

    // Get Teams
    const lumbini = await Team.findOne({ name: 'Lumbini Lions' });
    const biratnagar = await Team.findOne({ name: 'Biratnagar Kings' });

    if (lumbini && biratnagar) {
      await Player.create({
        name: 'Rohit Paudel',
        currentTeam: lumbini._id,
        isMarquee: true
      });

      await Player.create({
        name: 'Sandeep Lamichhane',
        currentTeam: biratnagar._id,
        isMarquee: true
      });

      console.log('Successfully seeded Marquee Players (Rohit Paudel & Sandeep Lamichhane)!');
    } else {
      console.log('Could not find teams. Make sure seedTeams.js has been run.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error seeding players:', err);
    process.exit(1);
  }
}

seedPlayers();
