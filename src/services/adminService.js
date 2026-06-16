const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Seat = require('../models/Seat');
const Match = require('../models/Match');
const FraudLog = require('../models/FraudLog');
const AttendanceLog = require('../models/AttendanceLog');
const AIPrediction = require('../models/AIPrediction');
const { modelRegistry } = require('./ai');

/**
 * Compile analytical indicators for the Admin Dashboard.
 */
async function getAdminAnalytics() {
  // 1. Revenue Metrics
  const totalRevenueResult = await Booking.aggregate([
    { $match: { status: 'confirmed' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);
  const totalRevenue = totalRevenueResult[0]?.total || 0;

  // 2. Booking Category Distribution
  const categorySales = await Ticket.aggregate([
    {
      $lookup: {
        from: 'seats',
        localField: 'seat',
        foreignField: '_id',
        as: 'seatDetails',
      },
    },
    { $unwind: '$seatDetails' },
    {
      $group: {
        _id: '$seatDetails.category',
        count: { $sum: 1 },
        revenue: { $sum: '$seatDetails.price' },
      },
    },
  ]);

  const salesByCategory = {
    vip: { count: 0, revenue: 0 },
    premium: { count: 0, revenue: 0 },
    general: { count: 0, revenue: 0 },
  };

  categorySales.forEach((item) => {
    if (salesByCategory[item._id]) {
      salesByCategory[item._id] = {
        count: item.count,
        revenue: item.revenue,
      };
    }
  });

  // 3. Attendance Ratios
  const totalTickets = await Ticket.countDocuments();
  const scannedTickets = await Ticket.countDocuments({ scanned: true });
  const entryRate = totalTickets > 0 ? ((scannedTickets / totalTickets) * 100).toFixed(1) : '0.0';

  // 4. Match-wise Performance Occupancy
  const matches = await Match.find().lean();
  const matchPerformance = [];

  for (const match of matches) {
    const totalMatchSeats = await Seat.countDocuments({ match: match._id });
    const bookedMatchSeats = await Seat.countDocuments({ match: match._id, status: 'booked' });
    const matchRevenueResult = await Booking.aggregate([
      { $match: { match: match._id, status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const matchRevenue = matchRevenueResult[0]?.total || 0;

    matchPerformance.push({
      matchId: match._id,
      title: match.title,
      occupancy: totalMatchSeats > 0 ? ((bookedMatchSeats / totalMatchSeats) * 100).toFixed(1) : '0.0',
      revenue: matchRevenue,
    });
  }

  // 5. Fraud Alert Counter
  const fraudCounts = await FraudLog.aggregate([
    { $group: { _id: '$reason', count: { $sum: 1 } } },
  ]);

  const fraudAlerts = {
    duplicate_scan: 0,
    invalid_ticket: 0,
    unauthorized_attempt: 0,
  };

  fraudCounts.forEach((item) => {
    if (fraudAlerts[item._id] !== undefined) {
      fraudAlerts[item._id] = item.count;
    }
  });

  // 6. AI Model Statistics
  const aiStats = modelRegistry.getStats();

  // 7. AI Prediction Counts (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const predictionCounts = await AIPrediction.aggregate([
    {
      $match: {
        timestamp: { $gte: sevenDaysAgo },
      },
    },
    {
      $group: {
        _id: '$modelKey',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' },
      },
    },
  ]);

  return {
    totalRevenue,
    salesByCategory,
    attendance: {
      totalTickets,
      scannedTickets,
      entryRate,
    },
    matchPerformance,
    fraudAlerts,
    aiStats: {
      models: aiStats.models,
      predictions: predictionCounts,
    },
  };
}

/**
 * Fetch logs representing fraudulent or rejected ticket checkins.
 */
async function getFraudLogs() {
  return FraudLog.find()
    .populate('ticket')
    .populate('match')
    .populate('scannedBy', 'name email')
    .sort({ timestamp: -1 })
    .limit(30);
}

module.exports = {
  getAdminAnalytics,
  getFraudLogs,
};
