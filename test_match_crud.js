require('dotenv').config({ path: '/Users/sushant/Desktop/smart-stadium/backend/.env' });
const mongoose = require('mongoose');
const matchService = require('./src/services/matchService');
const User = require('./src/models/User');

async function runTests() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    // Find any admin user to act as creator
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.create({
        name: 'Test Admin',
        email: 'testadmin@example.com',
        password: 'password123',
        role: 'admin',
      });
    }

    // 1. Create Match
    console.log("\n--- Testing Match Creation ---");
    const createPayload = {
      title: 'Nepal vs India - T20 Friendly',
      teamA: 'Nepal',
      teamB: 'India',
      venue: 'Smart Stadium Arena',
      matchDate: new Date(Date.now() + 86400000), // Tomorrow
      match_type: 'Friendly',
      match_stage: 'League Stage',
      cricket_format: 'T20',
      pricing: { platinum: 5000, gold: 3000 }
    };
    
    const newMatch = await matchService.createMatch(admin._id, createPayload);
    console.log("Match created successfully. ID:", newMatch._id);
    console.log("Fields saved: Type=", newMatch.match_type, "| Format=", newMatch.cricket_format);

    // 2. Edit Match
    console.log("\n--- Testing Match Editing ---");
    const updatePayload = {
      title: 'Nepal vs India - T20 Cup Final',
      match_type: 'Cup',
      match_stage: 'Finals'
    };
    const updatedMatch = await matchService.updateMatch(newMatch._id, updatePayload);
    console.log("Match updated successfully.");
    console.log("New Title:", updatedMatch.title);
    console.log("New Type:", updatedMatch.match_type);
    console.log("New Stage:", updatedMatch.match_stage);

    // 3. Cancel Match
    console.log("\n--- Testing Match Cancellation ---");
    const cancelledMatch = await matchService.cancelMatch(newMatch._id);
    console.log("Match cancelled successfully.");
    console.log("Status:", cancelledMatch.status);

  } catch (error) {
    console.error("\nTEST FAILED:", error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    mongoose.connection.close();
    process.exit();
  }
}

runTests();
