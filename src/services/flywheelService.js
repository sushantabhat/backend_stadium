const fs = require('fs');
const path = require('path');
const Match = require('../models/Match');
const Ticket = require('../models/Ticket');
const { calculateMatchHypeAndWeather } = require('./aiService');

const CSV_PATH = path.join(__dirname, '..', '..', 'ml', 'data', 'Real_Cricket_Data.csv');

/**
 * processCompletedMatch
 * Called when a match is marked as 'completed'.
 * Extracts the exact conditions of the match and the final attendance to build the continuous learning dataset.
 */
async function processCompletedMatch(matchId) {
  try {
    console.log(`[Flywheel] Processing completed match: ${matchId}`);
    
    const match = await Match.findById(matchId);
    if (!match) {
      console.error(`[Flywheel] Match ${matchId} not found.`);
      return;
    }

    // 1. Calculate actual attendance (valid tickets sold)
    const attendance_actual = await Ticket.countDocuments({
      match: matchId,
      status: { $ne: 'cancelled' }
    });

    console.log(`[Flywheel] Final attendance for match ${matchId}: ${attendance_actual}`);

    // 2. Recalculate Hype and Weather exactly as it was at match time
    const { 
      expected_popularity, 
      max_temp, 
      rain_mm, 
      is_weekend, 
      is_holiday 
    } = await calculateMatchHypeAndWeather(match);

    const stadium_capacity = match.venue_capacity || 15000;

    // 3. Build CSV Row
    // Format: stadium_capacity,expected_popularity,is_weekend,is_holiday,max_temp,rain_mm,attendance_actual
    const row = `${stadium_capacity},${expected_popularity},${is_weekend},${is_holiday},${max_temp},${rain_mm},${attendance_actual}\n`;

    // 4. Append to CSV, creating headers if file doesn't exist
    if (!fs.existsSync(CSV_PATH)) {
      console.log(`[Flywheel] Creating new Real_Cricket_Data.csv file...`);
      const headers = `stadium_capacity,expected_popularity,is_weekend,is_holiday,max_temp,rain_mm,attendance_actual\n`;
      fs.writeFileSync(CSV_PATH, headers);
    }

    fs.appendFileSync(CSV_PATH, row);
    console.log(`[Flywheel] Successfully appended new real match data to CSV!`);

  } catch (err) {
    console.error(`[Flywheel] Error processing completed match:`, err);
  }
}

module.exports = {
  processCompletedMatch
};
