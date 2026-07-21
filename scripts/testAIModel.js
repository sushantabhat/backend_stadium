const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const Match = require('../src/models/Match');
const Team = require('../src/models/Team');
const Venue = require('../src/models/Venue');
const { predictAttendance } = require('../src/services/aiService');

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for AI Testing.');

  const venue = await Venue.findOne();
  if (!venue) throw new Error("No venue found");

  const nepal = await Team.findOne({ name: 'Nepal' });
  const india = await Team.findOne({ name: 'India' });
  const ktm = await Team.findOne({ name: 'Kathmandu Gurkhas' });
  const chitwan = await Team.findOne({ name: 'Chitwan Rhinos' });
  const uganda = await Team.findOne({ name: 'Uganda' });

  const testCases = [
    { name: 'NPL Standard', teamA: ktm.name, teamB: chitwan.name, type: 'NPL', stage: 'League Stage', format: 'T20', gStar: 0, iStar: 0, lStar: 3 },
    { name: 'NPL Final (High Stakes)', teamA: ktm.name, teamB: chitwan.name, type: 'NPL', stage: 'Finals', format: 'T20', gStar: 1, iStar: 2, lStar: 5 },
    { name: 'NPL Quarter-Final', teamA: ktm.name, teamB: chitwan.name, type: 'NPL', stage: 'Quarter-Finals', format: 'T20', gStar: 0, iStar: 1, lStar: 2 },
    { name: 'Intl: Nepal vs India (High Rank)', teamA: nepal.name, teamB: india.name, type: 'International', stage: 'League Stage', format: 'T20', gStar: 0, iStar: 0, lStar: 0 },
    { name: 'Intl: Nepal vs Uganda (Low Rank)', teamA: nepal.name, teamB: uganda.name, type: 'International', stage: 'League Stage', format: 'T20', gStar: 0, iStar: 0, lStar: 0 },
    { name: 'Intl Final: Nepal vs India', teamA: nepal.name, teamB: india.name, type: 'International', stage: 'Finals', format: 'ODI', gStar: 0, iStar: 0, lStar: 0 },
    { name: 'Friendly Match', teamA: ktm.name, teamB: nepal.name, type: 'Friendly', stage: 'League Stage', format: 'T10', gStar: 0, iStar: 0, lStar: 0 }
  ];

  const results = [];

  for (const tc of testCases) {
    try {
      const match = await Match.create({
        title: `TEST: ${tc.name}`,
        venue: venue.name,
        teamA: tc.teamA,
        teamB: tc.teamB,
        match_type: tc.type,
        match_stage: tc.stage,
        cricket_format: tc.format,
        global_stars_count: tc.gStar,
        international_stars_count: tc.iStar,
        local_stars_count: tc.lStar,
        date: new Date(),
        matchDate: new Date(),
        createdBy: new mongoose.Types.ObjectId()
      });

      const prediction = await predictAttendance(match._id);
      
      const predicted = prediction.prediction;
      const capacity = 15000;
      
      let bug = null;
      if (predicted > capacity) {
        bug = 'OVERFLOW';
      } else if (predicted < 0) {
        bug = 'NEGATIVE';
      } else if (isNaN(predicted)) {
        bug = 'NAN';
      }

      results.push({
        TestCase: tc.name,
        Type: tc.type,
        Stage: tc.stage,
        Format: tc.format,
        Capacity: capacity,
        Predicted: predicted,
        Percentage: ((predicted / capacity) * 100).toFixed(1) + '%',
        Bug: bug || 'None'
      });

      await Match.findByIdAndDelete(match._id);
    } catch (e) {
      results.push({ TestCase: tc.name, Bug: `ERROR: ${e.message}` });
    }
  }

  console.table(results);
  
  // Write to a markdown artifact format in stdout so agent can parse it
  console.log("---MARKDOWN_START---");
  console.log("# AI Prediction Engine Accuracy & Stress Test Report");
  console.log("");
  console.log("I ran a comprehensive test combining different Match Types, Stages, Formats, and Star Players to stress test the AI Prediction Model.");
  console.log("");
  console.log("| Test Case | Match Type | Stage | Format | Predicted / Capacity | Fill % | Bugs Detected |");
  console.log("|---|---|---|---|---|---|---|");
  results.forEach(r => {
    console.log(`| ${r.TestCase} | ${r.Type} | ${r.Stage} | ${r.Format} | ${r.Predicted} / ${r.Capacity} | ${r.Percentage} | **${r.Bug}** |`);
  });
  console.log("---MARKDOWN_END---");

  mongoose.connection.close();
}

runTests();
