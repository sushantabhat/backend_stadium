require('dotenv').config({ path: '/Users/sushant/Desktop/smart-stadium/backend/.env' });
const mongoose = require('mongoose');
const matchService = require('./src/services/matchService');
const aiService = require('./src/services/aiService');
const User = require('./src/models/User');

async function testUAENepalFriendly() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log("No admin found. Exiting.");
      process.exit(1);
    }

    // 1. Create a UAE vs Nepal Friendly (T20)
    console.log("Creating UAE vs Nepal T20 Friendly match...");
    const payload = {
      title: 'Nepal vs UAE - T20 Friendly',
      teamA: 'Nepal',
      teamB: 'UAE',
      venue: 'TU Cricket Ground',
      matchDate: new Date(Date.now() + 86400000 * 3), // 3 days from now
      match_type: 'Friendly',
      cricket_format: 'T20',
      pricing: { gold: 1500, general: 500 }
    };
    
    const newMatch = await matchService.createMatch(admin._id, payload);
    console.log(`Match created successfully in Database (ID: ${newMatch._id})`);

    // 2. Run the AI Prediction Pipeline
    console.log("\nAsking the AI for attendance prediction...");
    const prediction = await aiService.predictAttendance(newMatch._id);
    
    console.log("\n====== AI PREDICTION RESULTS ======");
    console.log("Predicted Attendance:", prediction.prediction);
    console.log("Calculated Factors Sent to Python:");
    console.table(prediction.factors);
    console.log("===================================");

    // 3. Clean up (Cancel match so it doesn't clutter the DB)
    await matchService.cancelMatch(newMatch._id);
    console.log("\n(Test Match cleaned up from DB)");

  } catch (error) {
    console.error("Test Failed:", error);
  } finally {
    mongoose.connection.close();
    process.exit();
  }
}

testUAENepalFriendly();
