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
 * AI Dynamic Pricing Suggester.
 * Calculates occupancy and recommends pricing multipliers based on seat demand.
 */
async function getDynamicPricingSuggestions(matchId) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw createHttpError('Match not found', 404);
  }

  const totalSeats = await Seat.countDocuments({ match: matchId });
  const bookedSeats = await Seat.countDocuments({ match: matchId, status: 'booked' });
  const lockedSeats = await Seat.countDocuments({ match: matchId, status: 'locked' });

  // Calculate demand factors
  const occupancyRate = totalSeats > 0 ? bookedSeats / totalSeats : 0;
  const holdRate = totalSeats > 0 ? lockedSeats / totalSeats : 0;
  const activityMetric = occupancyRate + holdRate * 0.5; // Locked seats weigh half as much

  let multiplier = 1.0;
  let demandLevel = 'Low';

  if (activityMetric >= 0.8) {
    multiplier = 1.40; // +40%
    demandLevel = 'Critical (Sold Out Warning)';
  } else if (activityMetric >= 0.5) {
    multiplier = 1.25; // +25%
    demandLevel = 'High';
  } else if (activityMetric >= 0.2) {
    multiplier = 1.10; // +10%
    demandLevel = 'Moderate';
  }

  return {
    matchId,
    title: match.title,
    currentPricing: match.pricing,
    suggestedPricing: {
      vip: Math.round(match.pricing.vip * multiplier),
      premium: Math.round(match.pricing.premium * multiplier),
      general: Math.round(match.pricing.general * multiplier),
    },
    occupancyRate: (occupancyRate * 100).toFixed(1),
    holdRate: (holdRate * 100).toFixed(1),
    multiplier,
    demandLevel,
  };
}

/**
 * AI Smart Seat Recommendation.
 * Suggests the best vacant seats in a category (center columns in closest rows).
 */
async function getSmartSeatRecommendations(matchId, category, count = 2) {
  const match = await Match.findById(matchId);
  if (!match) {
    throw createHttpError('Match not found', 404);
  }

  const seatsPerRow = match.seatLayout.seatsPerRow;
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

  // AI Sorting: Prefer closest row alphabetically, then closest seat to the center column
  const sortedRecommendations = availableSeats.sort((a, b) => {
    // 1. Compare row letters (Row A < Row B)
    if (a.row !== b.row) {
      return a.row.localeCompare(b.row);
    }
    // 2. Compare distance to center column
    const distA = Math.abs(a.number - centerCol);
    const distB = Math.abs(b.number - centerCol);
    return distA - distB;
  });

  return sortedRecommendations.slice(0, Number(count));
}

/**
 * AI Match Recommendation.
 * Suggests matches based on user's booking history and team preference,
 * falling back to overall trending matches if no history exists.
 */
async function getMatchRecommendations(userId) {
  // Fetch user's past bookings
  const userBookings = await Booking.find({ user: userId }).populate('match');

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

  const recommendations = [];

  // Calculate recommendation scores
  for (const match of upcomingMatches) {
    let score = 0;
    let reason = 'Trending Match';

    // 1. Team preference match (+100 score points)
    const matchesTeamA = preferredTeams.has(match.teamA);
    const matchesTeamB = preferredTeams.has(match.teamB);

    if (matchesTeamA || matchesTeamB) {
      score += 100;
      const favoriteTeam = matchesTeamA ? match.teamA : match.teamB;
      reason = `Recommended based on your interest in ${favoriteTeam}`;
    }

    // 2. Occupancy interest score (Higher sales = trending)
    const totalSeats = await Seat.countDocuments({ match: match._id });
    const bookedSeats = await Seat.countDocuments({ match: match._id, status: 'booked' });
    const occupancyRate = totalSeats > 0 ? bookedSeats / totalSeats : 0;
    score += occupancyRate * 50;

    if (score > 50 && reason === 'Trending Match') {
      reason = 'Highly in demand near you';
    }

    // Append seat availability statistics
    const stats = {
      total: totalSeats,
      available: totalSeats - bookedSeats,
      booked: bookedSeats,
    };

    recommendations.push({
      ...match,
      score,
      reason,
      stats,
    });
  }

  // Sort by score descending and return top recommendations
  return recommendations.sort((a, b) => b.score - a.score).slice(0, 5);
}

module.exports = {
  getDynamicPricingSuggestions,
  getSmartSeatRecommendations,
  getMatchRecommendations,
};
