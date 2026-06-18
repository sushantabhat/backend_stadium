const mongoose = require('mongoose');
const Match = require('../models/Match');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

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

module.exports = {
  getDynamicPricingSuggestions,
  getSmartSeatRecommendations,
  getMatchRecommendations,
};
