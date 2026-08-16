require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Match = require('../src/models/Match');
const flywheelService = require('../src/services/flywheelService');

async function testFlywheel() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-stadium');
  console.log('Connected to DB');

  try {
    // 1. Find an existing match
    const match = await Match.findOne();
    if (!match) {
      console.log('No matches found to test.');
      process.exit(1);
    }

    console.log(`Testing Flywheel with Match: ${match.title}`);
    
    // 2. Trigger the flywheel
    await flywheelService.processCompletedMatch(match._id);
    
    console.log('Test completed successfully!');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    mongoose.disconnect();
  }
}

testFlywheel();
