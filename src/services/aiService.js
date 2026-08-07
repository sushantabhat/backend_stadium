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
  "Kathmandu Gurkhas": 8,
  "Chitwan Rhinos": 7,
  "Janakpur Bolts": 8,
  "Biratnagar Kings": 6,
  "Lumbini Lions": 5,
  "Pokhara Avengers": 5,
  "Sudurpaschim Royals": 4,
  "Karnali Yaks": 4,
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
  'Lumbini': { lat: 27.4840, lon: 83.2761 },
  'Janakpur': { lat: 26.7288, lon: 85.9260 },
  'Karnali': { lat: 28.5993, lon: 81.6241 },
  'Dhangadhi': { lat: 28.6946, lon: 80.5621 },
};

/**
 * predictAttendance Prediction
 * Spawns a child process to run the trained Python model.
 */
async function calculateMatchHypeAndWeather(match) {
  const matchDate = new Date(match.matchDate);
  
  const mStage = match.match_stage || "League Stage";
  
  let teamATier = 2;
  let teamBTier = 2;
  let hasTeamRivalry = 0;
  let isHomeMatch = 0;
  let avgTicketPrice = 500;
  let matchTime = matchDate.getHours() >= 16 ? "Day-Night" : "Day";

  try {
    const teamADoc = await Team.findOne({ name: match.teamA });
    const teamBDoc = await Team.findOne({ name: match.teamB });
    
    if (teamADoc) teamATier = teamADoc.franchiseTier || 2;
    if (teamBDoc) teamBTier = teamBDoc.franchiseTier || 2;
    
    const isRivalry = rivalries.some(r => 
      (r.includes(match.teamA) && r.includes(match.teamB))
    );
    if (isRivalry) hasTeamRivalry = 1;
    
    const venueRecord = await Venue.findOne({ name: match.venue });
    const matchCity = venueRecord?.location || 'Kathmandu';
    if ((teamADoc && teamADoc.homeCity === matchCity) || (teamBDoc && teamBDoc.homeCity === matchCity)) {
      isHomeMatch = 1;
    }

    if (match.pricing && match.pricing.size > 0) {
      const pricingObj = match.pricing instanceof Map
        ? Object.fromEntries(match.pricing)
        : match.pricing || {};
      const sections = match.stadiumSections || [];
      let totalSeats = 0;
      let weightedSum = 0;
      for (const section of sections) {
        const price = pricingObj[section.category] || section.pricePerTicket || 0;
        const seats = section.totalSeats || 0;
        weightedSum += price * seats;
        totalSeats += seats;
      }
      avgTicketPrice = totalSeats > 0 ? Math.round(weightedSum / totalSeats) : 500;
    }
  } catch (err) {
    console.log('[AI Logic] Error fetching team logic:', err);
  }

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

  return {
    teamATier,
    teamBTier,
    mStage,
    hasTeamRivalry,
    isHomeMatch,
    matchTime,
    avgTicketPrice,
    max_temp,
    rain_mm,
    is_weekend: [0, 6].includes(matchDate.getDay()) ? 1 : 0,
    is_holiday: 0
  };
}

async function predictAttendance(matchId) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw createHttpError('Match not found', 404);
  }

  const features = await calculateMatchHypeAndWeather(match);

  const inputData = {
    stadium_capacity: match.totalSeats || 15000,
    team_a_tier: features.teamATier,
    team_b_tier: features.teamBTier,
    match_stage: features.mStage,
    has_team_rivalry: features.hasTeamRivalry,
    is_home_match: features.isHomeMatch,
    match_time: features.matchTime,
    average_ticket_price: features.avgTicketPrice,
    is_weekend: features.is_weekend,
    is_holiday: features.is_holiday,
    max_temp: features.max_temp,
    rain_mm: features.rain_mm
  };

  console.log(`[AI Prediction] Match: ${match.teamA} vs ${match.teamB} | Stage: ${inputData.match_stage} | Capacity: ${inputData.stadium_capacity} | Tiers: T${inputData.team_a_tier} v T${inputData.team_b_tier} | Rivalry: ${inputData.has_team_rivalry} | Home: ${inputData.is_home_match}`);

  return resolve({
    matchId,
    prediction: 0,
    factors: inputData,
    features: {},
    timestamp: new Date(),
    message: "AI Model stripped. Awaiting brand new implementation."
  });
}

module.exports = {
  getMatchRecommendations,
  predictAttendance,
  calculateMatchHypeAndWeather,
};
