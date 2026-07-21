require('dotenv').config({ path: '/Users/sushant/Desktop/smart-stadium/backend/.env' });
const mongoose = require('mongoose');
const matchService = require('./src/services/matchService');
const aiService = require('./src/services/aiService');
const Venue = require('./src/models/Venue');
const User = require('./src/models/User');

async function testWeather() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    let admin = await User.findOne({ role: 'admin' });
    
    // 1. Create a Venue in Pokhara
    console.log("Creating Test Venue in Pokhara...");
    const venue = await Venue.create({
      name: 'Pokhara Test Stadium',
      location: 'Pokhara',
      createdBy: admin._id,
      stadiumSections: [{
        sectionId: 'A',
        category: 'general',
        pricePerTicket: 500,
        totalSeats: 10000,
        rows: ['A'],
        polygon: '...',
        gate: '1'
      }]
    });

    // 2. Create a Match at that venue for TOMORROW
    console.log("Creating Match in Pokhara for Tomorrow...");
    const payload = {
      title: 'Pokhara Rain Test Match',
      teamA: 'Gandaki',
      teamB: 'Bagmati',
      venue: 'Pokhara Test Stadium',
      matchDate: new Date(Date.now() + 86400000), // Tomorrow
      match_type: 'League',
      cricket_format: 'T20',
      pricing: { general: 500 }
    };
    
    const newMatch = await matchService.createMatch(admin._id, payload);

    // 3. Run the AI Prediction Pipeline
    console.log("\nAsking the AI for attendance prediction...");
    const prediction = await aiService.predictAttendance(newMatch._id);
    
    console.log("\n====== AI PREDICTION RESULTS ======");
    console.log("Predicted Attendance:", prediction.prediction);
    console.log("Calculated Factors Sent to Python:");
    console.table(prediction.factors);
    console.log("===================================");

    // 4. Clean up
    await matchService.cancelMatch(newMatch._id);
    await Venue.findByIdAndDelete(venue._id);
    console.log("\n(Test Match & Venue cleaned up from DB)");

  } catch (error) {
    console.error("Test Failed:", error);
  } finally {
    mongoose.connection.close();
    process.exit();
  }
}

testWeather();
