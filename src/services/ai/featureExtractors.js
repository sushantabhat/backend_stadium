const mongoose = require('mongoose');
const Booking = require('../../models/Booking');
const Ticket = require('../../models/Ticket');
const Seat = require('../../models/Seat');
const Match = require('../../models/Match');
const AttendanceLog = require('../../models/AttendanceLog');
const FraudLog = require('../../models/FraudLog');

/**
 * FEATURE EXTRACTORS
 * 
 * These functions extract features from raw MongoDB data.
 * Currently used by rule-based prediction engines.
 * Can be reused by ML models in the future.
 * 
 * Design: Each extractor returns a standardized feature object
 * that can be consumed by any prediction engine.
 */

// ==================== USER FEATURES ====================

/**
 * Extract user behavior features from booking history
 * @param {string} userId - User ID
 * @returns {Object} User behavior features
 */
async function extractUserFeatures(userId) {
  const bookings = await Booking.find({ user: userId })
    .populate('match')
    .populate('seats');

  const tickets = await Ticket.find({ user: userId });

  // Calculate booking frequency (bookings per month)
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const recentBookings = bookings.filter(b => b.createdAt >= sixMonthsAgo);
  const bookingFrequency = recentBookings.length / 6; // per month

  // Extract team preferences
  const teamBookings = {};
  bookings.forEach(b => {
    if (b.match) {
      teamBookings[b.match.teamA] = (teamBookings[b.match.teamA] || 0) + 1;
      teamBookings[b.match.teamB] = (teamBookings[b.match.teamB] || 0) + 1;
    }
  });

  // Extract category preferences
  const categoryCounts = {};
  bookings.forEach(b => {
    if (b.seats) {
      b.seats.forEach(seat => {
        if (seat.category) {
          categoryCounts[seat.category] = (categoryCounts[seat.category] || 0) + 1;
        }
      });
    }
  });

  const totalCategoryBookings = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
  const categoryPreferences = {};
  for (const [cat, count] of Object.entries(categoryCounts)) {
    categoryPreferences[cat] = totalCategoryBookings > 0 ? count / totalCategoryBookings : 0;
  }

  // Extract venue preferences
  const venueBookings = {};
  bookings.forEach(b => {
    if (b.match && b.match.venue) {
      venueBookings[b.match.venue] = (venueBookings[b.match.venue] || 0) + 1;
    }
  });

  // Calculate average spending per booking
  const totalSpent = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const avgSpendingPerBooking = bookings.length > 0 ? totalSpent / bookings.length : 0;

  // Calculate price sensitivity (variance in spending)
  const spendingVariance = bookings.length > 1
    ? bookings.reduce((sum, b) => sum + Math.pow((b.totalAmount || 0) - avgSpendingPerBooking, 2), 0) / bookings.length
    : 0;

  return {
    userId,
    totalBookings: bookings.length,
    bookingFrequency,
    teamPreferences: teamBookings,
    categoryPreferences,
    venuePreferences: venueBookings,
    avgSpendingPerBooking,
    priceSensitivity: Math.sqrt(spendingVariance),
    lastBookingDate: bookings.length > 0 ? bookings[bookings.length - 1].createdAt : null,
  };
}

// ==================== MATCH FEATURES ====================

/**
 * Extract match-specific features for pricing and recommendations
 * @param {string} matchId - Match ID
 * @returns {Object} Match features
 */
async function extractMatchFeatures(matchId) {
  const match = await Match.findById(matchId);
  if (!match) return null;

  const totalSeats = await Seat.countDocuments({ match: matchId });
  const bookedSeats = await Seat.countDocuments({ match: matchId, status: 'booked' });
  const lockedSeats = await Seat.countDocuments({ match: matchId, status: 'locked' });
  const availableSeats = await Seat.countDocuments({ match: matchId, status: 'available' });

  // Category-wise availability
  const categoryStats = {};
  const categories = ['category1', 'category2', 'category3', 'category4', 'vip', 'supporters'];
  for (const cat of categories) {
    const catTotal = await Seat.countDocuments({ match: matchId, category: cat });
    const catBooked = await Seat.countDocuments({ match: matchId, category: cat, status: 'booked' });
    categoryStats[cat] = {
      total: catTotal,
      booked: catBooked,
      available: catTotal - catBooked,
      occupancyRate: catTotal > 0 ? catBooked / catTotal : 0,
    };
  }

  // Time features
  const matchDate = new Date(match.matchDate);
  const now = new Date();
  const hoursUntilMatch = (matchDate - now) / (1000 * 60 * 60);
  const daysUntilMatch = hoursUntilMatch / 24;
  const isMatchDay = daysUntilMatch <= 1 && daysUntilMatch >= 0;
  const isWeekend = [0, 6].includes(matchDate.getDay());

  // Sales velocity (bookings in last 24 hours)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentBookings = await Booking.countDocuments({
    match: matchId,
    status: 'confirmed',
    createdAt: { $gte: oneDayAgo },
  });

  return {
    matchId,
    title: match.title,
    teamA: match.teamA,
    teamB: match.teamB,
    venue: match.venue,
    pricing: match.pricing,
    seatLayout: match.seatLayout,
    totalSeats,
    bookedSeats,
    lockedSeats,
    availableSeats,
    occupancyRate: totalSeats > 0 ? bookedSeats / totalSeats : 0,
    holdRate: totalSeats > 0 ? lockedSeats / totalSeats : 0,
    categoryStats,
    hoursUntilMatch,
    daysUntilMatch,
    isMatchDay,
    isWeekend,
    salesVelocity: recentBookings,
    status: match.status,
  };
}

// ==================== SEAT FEATURES ====================

/**
 * Extract seat features for smart recommendations
 * @param {string} matchId - Match ID
 * @param {string} category - Seat category (optional)
 * @returns {Object} Seat features
 */
async function extractSeatFeatures(matchId, category = null) {
  const match = await Match.findById(matchId);
  if (!match) return null;

  const query = { match: matchId, status: 'available' };
  if (category) query.category = category;

  const seats = await Seat.find(query);
  const seatLayout = match.seatLayout || {};
  const seatsPerRow = seatLayout.seatsPerRow || 20;
  const centerCol = Math.ceil(seatsPerRow / 2);

  // Calculate features for each seat
  const seatFeatures = seats.map(seat => {
    const rowOrder = seat.row.charCodeAt(0) - 65; // A=0, B=1, etc.
    const distanceToCenter = Math.abs(seat.number - centerCol);
    const distanceToFront = rowOrder; // Lower row = closer to front

    return {
      seatId: seat._id,
      seatLabel: seat.seatLabel,
      row: seat.row,
      number: seat.number,
      category: seat.category,
      price: seat.price,
      rowOrder,
      distanceToCenter,
      distanceToFront,
      // Composite score for rule-based engine
      proximityScore: (1 / (distanceToCenter + 1)) * (1 / (distanceToFront + 1)),
    };
  });

  // Category statistics
  const categoryStats = {};
  const seatCategories = ['category1', 'category2', 'category3', 'category4', 'vip', 'supporters'];
  for (const cat of seatCategories) {
    const catSeats = seats.filter(s => s.category === cat);
    categoryStats[cat] = {
      total: catSeats.length,
      avgPrice: catSeats.length > 0
        ? catSeats.reduce((sum, s) => sum + s.price, 0) / catSeats.length
        : 0,
      centerAvailable: catSeats.filter(s => Math.abs(s.number - centerCol) <= 2).length,
    };
  }

  return {
    matchId,
    seatsPerRow,
    centerCol,
    totalAvailable: seats.length,
    seats: seatFeatures,
    categoryStats,
  };
}

// ==================== FRAUD FEATURES ====================

/**
 * Extract fraud detection features from scan patterns
 * @param {string} ticketCode - Ticket code to analyze
 * @param {string} staffId - Staff member scanning
 * @returns {Object} Fraud features
 */
async function extractFraudFeatures(ticketCode, staffId) {
  const ticket = await Ticket.findOne({ ticketCode })
    .populate('user')
    .populate('match');

  if (!ticket) {
    return {
      ticketCode,
      isValid: false,
      fraudReason: 'invalid_ticket',
      riskScore: 1.0,
    };
  }

  // Check for duplicate scan
  if (ticket.scanned) {
    const timeSinceScan = ticket.scannedAt
      ? (new Date() - ticket.scannedAt) / 1000 // seconds
      : Infinity;

    return {
      ticketCode,
      ticketId: ticket._id,
      isValid: true,
      alreadyScanned: true,
      fraudReason: 'duplicate_scan',
      riskScore: 1.0,
      timeSinceLastScan: timeSinceScan,
      lastScanTime: ticket.scannedAt,
    };
  }

  // Analyze scan patterns for this staff member
  const staffScans = await AttendanceLog.find({ scannedBy: staffId })
    .sort({ entryTime: -1 })
    .limit(10);

  // Calculate scan frequency (scans per minute in last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentScans = staffScans.filter(s => s.entryTime >= oneHourAgo);
  const scanFrequency = recentScans.length; // scans in last hour

  // Calculate time between scans
  let avgTimeBetweenScans = 0;
  if (staffScans.length > 1) {
    const timeDiffs = [];
    for (let i = 1; i < staffScans.length; i++) {
      const diff = (staffScans[i - 1].entryTime - staffScans[i].entryTime) / 1000;
      timeDiffs.push(diff);
    }
    avgTimeBetweenScans = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
  }

  // Check for suspicious patterns
  const isRapidScanning = scanFrequency > 30; // More than 30 scans per hour
  const isUnusualPattern = avgTimeBetweenScans < 5 && recentScans.length > 5; // Very fast scanning

  // Calculate risk score
  let riskScore = 0;
  if (isRapidScanning) riskScore += 0.3;
  if (isUnusualPattern) riskScore += 0.3;

  return {
    ticketCode,
    ticketId: ticket._id,
    userId: ticket.user?._id,
    matchId: ticket.match?._id,
    isValid: true,
    alreadyScanned: false,
    fraudReason: null,
    riskScore: Math.min(riskScore, 1.0),
    scanFrequency,
    avgTimeBetweenScans,
    isRapidScanning,
    isUnusualPattern,
    recentScanCount: recentScans.length,
  };
}

// ==================== HISTORICAL FEATURES ====================

/**
 * Extract historical sales features for pricing model
 * @param {string} matchId - Match ID
 * @returns {Object} Historical features
 */
async function extractHistoricalFeatures(matchId) {
  const match = await Match.findById(matchId);
  if (!match) return null;

  // Get all bookings for this match
  const bookings = await Booking.find({ match: matchId, status: 'confirmed' });

  // Calculate sales by time period
  const now = new Date();
  const matchDate = new Date(match.matchDate);
  const hoursUntilMatch = (matchDate - now) / (1000 * 60 * 60);

  // Sales distribution by hours before match
  const salesByPeriod = {
    last24h: 0,
    last48h: 0,
    lastWeek: 0,
    earlier: 0,
  };

  bookings.forEach(b => {
    const bookingTime = new Date(b.createdAt);
    const hoursAgo = (now - bookingTime) / (1000 * 60 * 60);

    if (hoursAgo <= 24) salesByPeriod.last24h++;
    else if (hoursAgo <= 48) salesByPeriod.last48h++;
    else if (hoursAgo <= 168) salesByPeriod.lastWeek++;
    else salesByPeriod.earlier++;
  });

  // Revenue by category
  const revenueByCategory = {};
  for (const booking of bookings) {
    const seats = await Seat.find({ _id: { $in: booking.seats } });
    seats.forEach(seat => {
      revenueByCategory[seat.category] = (revenueByCategory[seat.category] || 0) + seat.price;
    });
  }

  // Average ticket price
  const totalRevenue = Object.values(revenueByCategory).reduce((a, b) => a + b, 0);
  const pricingObj = match.pricing instanceof Map ? Object.fromEntries(match.pricing) : match.pricing || {};
  const defaultPrice = Object.values(pricingObj).find((p) => typeof p === 'number') || 0;
  const avgTicketPrice = bookings.length > 0 ? totalRevenue / bookings.length : defaultPrice;

  // Demand trend (acceleration/deceleration)
  const salesVelocity = salesByPeriod.last24h;
  const prevVelocity = salesByPeriod.last48h - salesByPeriod.last24h;
  const demandTrend = prevVelocity > 0 ? salesVelocity / prevVelocity : 1;

  return {
    matchId,
    totalBookings: bookings.length,
    totalRevenue,
    avgTicketPrice,
    salesByPeriod,
    revenueByCategory,
    hoursUntilMatch,
    demandTrend,
    salesVelocity,
  };
}

module.exports = {
  extractUserFeatures,
  extractMatchFeatures,
  extractSeatFeatures,
  extractFraudFeatures,
  extractHistoricalFeatures,
};
