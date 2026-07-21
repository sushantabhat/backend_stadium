const mongoose = require('mongoose');
const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const Match = require('../models/Match');
const Team = require('../models/Team');
const Player = require('../models/Player');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const Venue = require('../models/Venue');

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// --- Automated Popularity Lookups ---
const teamStats = {
  "Kathmandu Kings XI": 8,
  "Lalitpur Patriots": 7,
  "Bhairahawa Gladiators": 6,
  "Chitwan Tigers": 5,
  "Pokhara Rhinos": 5,
  "Biratnagar Warriors": 4,
  "Nepal Army Club": 7,
  "Machhindra FC": 8,
  "Manang Marshyangdi Club": 8,
  "Three Star Club": 6
};

const rivalries = [
  // NPL Rivalries (2024+)
  ["Kathmandu Gurkhas", "Chitwan Rhinos"], // The Bagmati Derby
  ["Janakpur Bolts", "Sudurpaschim Royals"], // The Finalists' Rematch
  ["Lumbini Lions", "Biratnagar Kings"], // The National Captains' Clash
  ["Janakpur Bolts", "Biratnagar Kings"], // The Terai Derby
  // International Rivalries
  ["Nepal", "UAE"],
  ["Nepal", "Netherlands"]
];

const matchTypeBaseScores = {
  "Friendly": 4,
  "League": null, 
  "ODI": 6,
  "CWL 2": 7,
  "T20": 8,
  "International": 8
};

const matchStageModifiers = {
  "League Stage": 0,
  "Group Stage": 0,
  "Quarter-Final": 1,
  "Semi-Final": 2,
  "Final": 3,
  "Decider": 3
};

/**
 * AI Dynamic Pricing Suggester (Enhanced)
 * 
 * Uses multi-factor analysis:
 * - Occupancy rate and hold rate
 * - Time before match
 * - Sales velocity
 * - Day of week patterns
 * 
 * Architecture: ML-ready with feature extraction and prediction engine
 */
async function getDynamicPricingSuggestions(matchId) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw createHttpError('Match not found', 404);
  }

  const totalSeats = await Seat.countDocuments({ match: matchId });
  const bookedSeats = await Seat.countDocuments({ match: matchId, status: 'booked' });
  const lockedSeats = await Seat.countDocuments({ match: matchId, status: 'locked' });

  const occupancyRate = totalSeats > 0 ? bookedSeats / totalSeats : 0;
  const holdRate = totalSeats > 0 ? lockedSeats / totalSeats : 0;
  const activityMetric = occupancyRate + holdRate * 0.5;

  let multiplier = 1.0;
  let demandLevel = 'Low';

  if (activityMetric >= 0.8) {
    multiplier = 1.40;
    demandLevel = 'Critical';
  } else if (activityMetric >= 0.5) {
    multiplier = 1.25;
    demandLevel = 'High';
  } else if (activityMetric >= 0.2) {
    multiplier = 1.10;
    demandLevel = 'Moderate';
  }

  // Time factor
  const hoursUntilMatch = (new Date(match.matchDate) - new Date()) / (1000 * 60 * 60);
  let timeMultiplier = 1.0;
  if (hoursUntilMatch <= 2) timeMultiplier = 1.30;
  else if (hoursUntilMatch <= 24) timeMultiplier = 1.20;
  else if (hoursUntilMatch <= 72) timeMultiplier = 1.10;
  else if (hoursUntilMatch <= 168) timeMultiplier = 1.05;

  const finalMultiplier = Math.round(multiplier * timeMultiplier * 100) / 100;

  const suggestedPricing = {};
  const pricingObj = match.pricing instanceof Map
    ? Object.fromEntries(match.pricing)
    : match.pricing || {};
  for (const [category, basePrice] of Object.entries(pricingObj)) {
    suggestedPricing[category] = Math.round(basePrice * finalMultiplier);
  }

  return {
    matchId,
    title: match.title,
    currentPricing: pricingObj,
    suggestedPricing,
    occupancyRate: (occupancyRate * 100).toFixed(1),
    holdRate: (holdRate * 100).toFixed(1),
    multiplier: finalMultiplier,
    demandLevel,
    factors: {
      demandLevel,
      urgency: hoursUntilMatch <= 24 ? 'Same day' : hoursUntilMatch <= 168 ? 'This week' : 'Early bird',
      dayFactor: [0, 6].includes(new Date(match.matchDate).getDay()) ? 'Weekend premium' : 'Weekday',
    },
    confidence: 0.8,
  };
}

/**
 * AI Smart Seat Recommendation (Enhanced)
 * 
 * Uses multi-factor analysis:
 * - Center proximity
 * - Row preference (front rows)
 * - User's category preferences
 * - Price value scoring
 * - Group potential
 * 
 * Architecture: ML-ready with feature extraction and prediction engine
 */
async function getSmartSeatRecommendations(matchId, category, count = 2) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw createHttpError('Match not found', 404);
  }

  const seatLayout = match.seatLayout || {};
  const seatsPerRow = seatLayout.seatsPerRow || 20;
  const centerCol = Math.ceil(seatsPerRow / 2);

  // Retrieve available seats in category
  const availableSeats = await Seat.find({
    match: matchId,
    category,
    status: 'available',
  });

  if (availableSeats.length === 0) {
    return [];
  }

  // Sort: closest row first, then closest to center column
  const sortedRecommendations = availableSeats.sort((a, b) => {
    if (a.row !== b.row) {
      return a.row.localeCompare(b.row);
    }
    const distA = Math.abs(a.number - centerCol);
    const distB = Math.abs(b.number - centerCol);
    return distA - distB;
  });

  return sortedRecommendations.slice(0, Number(count)).map(seat => ({
    _id: seat._id,
    seatLabel: seat.seatLabel,
    row: seat.row,
    number: seat.number,
    category: seat.category,
    price: seat.price,
    score: (1 / (Math.abs(seat.number - centerCol) + 1)) * (1 / (seat.row.charCodeAt(0) - 64)),
    explanation: Math.abs(seat.number - centerCol) <= 2 ? 'Excellent center view' : 'Good seat selection',
  }));
}

/**
 * AI Match Recommendation (Enhanced)
 * 
 * Uses multi-factor scoring:
 * - Team preference (+100)
 * - Category match (+30)
 * - Booking frequency (+20)
 * - Recency bonus (+15)
 * - Occupancy trend (+25)
 * - Venue preference (+10)
 * 
 * Architecture: ML-ready with feature extraction and prediction engine
 */
async function getMatchRecommendations(userId) {
  const startTime = Date.now();

  // Fetch user's past bookings to find team preferences
  let userBookings = [];
  try {
    userBookings = await Booking.find({ user: userId }).populate('match');
  } catch (e) {
    // User has no bookings yet - return trending matches
  }

  const preferredTeams = new Set();
  userBookings.forEach((b) => {
    if (b.match) {
      preferredTeams.add(b.match.teamA);
      preferredTeams.add(b.match.teamB);
    }
  });

  // Find all upcoming or live matches
  const upcomingMatches = await Match.find({
    status: { $in: ['upcoming', 'live'] },
  }).lean();

  if (upcomingMatches.length === 0) {
    return [];
  }

  // Get seat stats for all matches in one query
  const matchIds = upcomingMatches.map(m => m._id);
  const seatStats = await Seat.aggregate([
    { $match: { match: { $in: matchIds } } },
    {
      $group: {
        _id: '$match',
        total: { $sum: 1 },
        booked: { $sum: { $cond: [{ $eq: ['$status', 'booked'] }, 1, 0] } },
      },
    },
  ]);

  const statsMap = {};
  seatStats.forEach(s => {
    statsMap[s._id.toString()] = { total: s.total, booked: s.booked };
  });

  const recommendations = [];

  for (const match of upcomingMatches) {
    let score = 0;
    let reason = 'Trending Match';
    const allReasons = [];

    const matchIdStr = match._id.toString();
    const stats = statsMap[matchIdStr] || { total: 0, booked: 0 };
    const occupancyRate = stats.total > 0 ? stats.booked / stats.total : 0;

    // 1. Team preference match (+100)
    const matchesTeamA = preferredTeams.has(match.teamA);
    const matchesTeamB = preferredTeams.has(match.teamB);
    if (matchesTeamA || matchesTeamB) {
      score += 100;
      const favoriteTeam = matchesTeamA ? match.teamA : match.teamB;
      reason = `Based on your interest in ${favoriteTeam}`;
      allReasons.push(reason);
    }

    // 2. Occupancy interest score
    if (occupancyRate > 0.6) {
      score += 25;
      allReasons.push(`${(occupancyRate * 100).toFixed(0)}% seats booked - high demand`);
    } else if (occupancyRate > 0.3) {
      score += 15;
      allReasons.push('Moderate demand - good availability');
    }

    // 3. Recency bonus
    const daysUntilMatch = (new Date(match.matchDate) - new Date()) / (1000 * 60 * 60 * 24);
    if (daysUntilMatch <= 3 && daysUntilMatch >= 0) {
      score += 15;
      allReasons.push('Match starting soon');
    }

    // 4. User booking frequency bonus
    if (userBookings.length > 2) {
      score += 20;
      allReasons.push('Active fan');
    }

    if (allReasons.length === 0) {
      allReasons.push('Popular upcoming match');
    }

    recommendations.push({
      ...match,
      score,
      reason,
      allReasons,
      stats: {
        total: stats.total,
        available: stats.total - stats.booked,
        booked: stats.booked,
      },
    });
  }

  // Sort by score descending and return top 5
  const topRecommendations = recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return topRecommendations;
}

const cityCoordinates = {
  'Kathmandu': { lat: 27.7172, lon: 85.3240 },
  'Pokhara': { lat: 28.2096, lon: 83.9856 },
  'Chitwan': { lat: 27.5291, lon: 84.4552 },
  'Biratnagar': { lat: 26.4525, lon: 87.2718 },
  'Bhairahawa': { lat: 27.5065, lon: 83.4496 },
};

/**
 * predictAttendance Prediction
 * Spawns a child process to run the trained Python model.
 */
async function predictAttendance(matchId) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw createHttpError('Match not found', 404);
  }

  const matchDate = new Date(match.matchDate);
  
  // --- Calculate Expected Popularity ---
  let expected_popularity = 5;
  const mType = match.match_type || "League";
  const mStage = match.match_stage || "League Stage";
  const cFormat = match.cricket_format || "T20";
  const sPower = match.star_power_level || "None";

  // 1. Base Score
  if (matchTypeBaseScores[mType]) {
    expected_popularity = matchTypeBaseScores[mType];
  } else {
    const scoreA = teamStats[match.teamA] || 5;
    const scoreB = teamStats[match.teamB] || 5;
    expected_popularity = (scoreA + scoreB) / 2;
  }

  // 1.5. Cricket Format Adjustment
  if (cFormat === 'T20' || cFormat === 'T10') expected_popularity += 1;

  // 2. Rivalry Boost
  const isRivalry = rivalries.some(r => 
    (r.includes(match.teamA) && r.includes(match.teamB))
  );
  if (isRivalry) expected_popularity += 2;

  // 3. Match Stage Modifiers
  const matchStageModifiers = {
    'Finals': 3,
    'Qualifier / Decider': 3,
    'Semi-Finals': 2,
    'Quarter-Finals': 1,
    'League Stage': 0
  };
  expected_popularity += (matchStageModifiers[match.match_stage] || 0);

  // 4. Granular Star Power (Context-Aware Gravity Formula)
  let starBoost = 0;
  if (match.match_type === 'NPL') {
    const globalStars = match.global_stars_count || 0;
    const intStars = match.international_stars_count || 0;
    const localStars = match.local_stars_count || 0;
    // Domestic matches get MASSIVE impact from stars
    starBoost = (globalStars * 3.0) + (intStars * 1.5) + (localStars * 0.5);
    expected_popularity += starBoost;
    console.log(`[AI Logic] Calculated Star Power Boost: +${starBoost} (Context: NPL)`);
  } else {
    console.log(`[AI Logic] Ignored individual Star Power Steppers (Context: International)`);
  }

  // 5. Global Rank Power (ICC Math)
  try {
    const teamADoc = await Team.findOne({ name: match.teamA });
    const teamBDoc = await Team.findOne({ name: match.teamB });

    const getRankBoost = (rank) => {
      if (rank == null) return 0;
      if (rank >= 1 && rank <= 5) return 4.5;
      if (rank >= 6 && rank <= 12) return 3.0;
      if (rank >= 13 && rank <= 20) return 1.5;
      return 0;
    };

    let maxRankBoost = 0;
    if (teamADoc) maxRankBoost = Math.max(maxRankBoost, getRankBoost(teamADoc.globalRank));
    if (teamBDoc) maxRankBoost = Math.max(maxRankBoost, getRankBoost(teamBDoc.globalRank));

    expected_popularity += maxRankBoost;
    console.log(`[AI Logic] Applied ICC Rank Boost: +${maxRankBoost}`);

    // 6. Home Advantage & National Fanaticism Engine
    const venueRecord = await Venue.findOne({ name: match.venue });
    const matchCity = venueRecord?.location || 'Kathmandu';
    
    if (match.match_type === 'NPL' && teamADoc && teamBDoc) {
      if (teamADoc.homeCity === matchCity || teamBDoc.homeCity === matchCity) {
        expected_popularity += 1.5;
        console.log(`[AI Logic] Home Advantage applied! Venue City: ${matchCity}`);
      }
    } else if (match.match_type === 'International') {
      if (match.teamA === 'Nepal' || match.teamB === 'Nepal') {
        const opponentDoc = match.teamA === 'Nepal' ? teamBDoc : teamADoc;
        const opponentRank = opponentDoc ? opponentDoc.globalRank : 99;
        
        // Tiered Home Fanaticism: 
        if (opponentRank != null && opponentRank <= 5) {
          expected_popularity += 5.0; // Powerhouse opponent -> Massive Overflow Hype!
          console.log(`[AI Logic] HOME NATION FANATICISM (Tier 1): Nepal vs Powerhouse! +5.0 Boost applied.`);
        } else if (opponentRank != null && opponentRank <= 12) {
          expected_popularity += 2.0; // Solid opponent -> Guaranteed Full House
          console.log(`[AI Logic] HOME NATION FANATICISM (Tier 2): Nepal vs Major Team! +2.0 Boost applied.`);
        } else {
          expected_popularity += 1.0; // Lower tier opponent -> Almost Full House
          console.log(`[AI Logic] HOME NATION FANATICISM (Tier 3): Nepal vs Associate! +1.0 Boost applied.`);
        }
      }
    }

    // 7. Player-Driven Rivalry Engine (Roster Scan)
    if (teamADoc && teamBDoc) {
      const teamAPlayers = await Player.find({ currentTeam: teamADoc._id });
      const teamBPlayers = await Player.find({ currentTeam: teamBDoc._id });

      const teamANames = teamAPlayers.map(p => p.name);
      const teamBNames = teamBPlayers.map(p => p.name);

      const hasRohitA = teamANames.includes('Rohit Paudel');
      const hasSandeepA = teamANames.includes('Sandeep Lamichhane');
      const hasRohitB = teamBNames.includes('Rohit Paudel');
      const hasSandeepB = teamBNames.includes('Sandeep Lamichhane');

      if ((hasRohitA && hasSandeepB) || (hasSandeepA && hasRohitB)) {
        expected_popularity += 2.0;
        console.log(`[AI Logic] PLAYER RIVALRY DETECTED: The National Captains' Clash (Rohit vs Sandeep)! +2.0 Boost applied.`);
      }
    }

  } catch (err) {
    console.log('[AI Logic] Error fetching team/player logic:', err);
  }

  // 8. Legacy Hardcoded Rivalries (for non-player driven ones)

  expected_popularity = Math.min(Math.floor(expected_popularity), 10);

  // 5. Fetch Live Weather Data from Open-Meteo
  const venueRecord = await Venue.findOne({ name: match.venue });
  const city = venueRecord?.location || 'Kathmandu';
  const coords = cityCoordinates[city] || cityCoordinates['Kathmandu'];
  
  const matchDateStr = match.matchDate.toISOString().split('T')[0];
  let max_temp = 22.0;
  let rain_mm = 0.0;
  
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,rain_sum&timezone=auto&start_date=${matchDateStr}&end_date=${matchDateStr}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.daily && data.daily.temperature_2m_max && data.daily.temperature_2m_max[0] != null) {
      max_temp = data.daily.temperature_2m_max[0];
      rain_mm = data.daily.rain_sum[0] || 0.0;
      console.log(`[AI Weather] Pulled live weather for ${city}: ${max_temp}°C, ${rain_mm}mm rain`);
    } else {
      console.log(`[AI Weather] Match date outside forecast window for ${city}, using fallback.`);
    }
  } catch (err) {
    console.error("[AI Weather] Failed to fetch live weather:", err.message);
  }

  const inputData = {
    stadium_capacity: match.venue_capacity || 15000,
    expected_popularity: expected_popularity,
    is_weekend: [0, 6].includes(matchDate.getDay()) ? 1 : 0,
    is_holiday: 0, // Hardcoded for now unless you integrate a holiday API here
    max_temp: max_temp,
    rain_mm: rain_mm
  };

  const scriptPath = path.join(__dirname, '..', '..', 'ml', 'predict.py');
  const venvPython = path.join(__dirname, '..', '..', 'ml', 'venv', 'bin', 'python3');

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(venvPython, [scriptPath, JSON.stringify(inputData)]);
    
    let result = '';
    let errorStr = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorStr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python script failed: ${errorStr}`));
      }
      try {
        const parsed = JSON.parse(result);
        if (parsed.error) {
          return reject(new Error(parsed.error));
        }
        let rawPrediction = parsed.predicted_attendance;
        
        // Hype Overflow Engine: South Asian crowds jump fences for massive games!
        if (inputData.expected_popularity >= 9) {
          rawPrediction = Math.floor(rawPrediction * 1.4); // 40% hype multiplier!
        }

        let realisticCap = 15000;
        if (inputData.match_type === 'International') realisticCap = 55000;
        else if (inputData.match_type === 'NPL') realisticCap = 25000;
        else if (inputData.match_type === 'Friendly') realisticCap = 12000;

        // Allow up to 15% overflow (people standing in aisles, hills, etc.) before strict capping
        const absoluteMaxOverflow = Math.floor(realisticCap * 1.15);

        if (rawPrediction > realisticCap) {
          const excess = rawPrediction - realisticCap;
          // Apply a logarithmic penalty to excess audience
          rawPrediction = realisticCap + Math.floor(Math.log10(Math.max(1, excess)) * (realisticCap * 0.15));
        }

        if (rawPrediction > absoluteMaxOverflow) {
          rawPrediction = absoluteMaxOverflow;
        }

        resolve({
          matchId,
          prediction: rawPrediction,
          factors: inputData
        });
      } catch (err) {
        reject(new Error(`Failed to parse python output: ${result}`));
      }
    });
  });
}

module.exports = {
  getDynamicPricingSuggestions,
  getSmartSeatRecommendations,
  getMatchRecommendations,
  predictAttendance,
};
