const User = require('../models/User');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Seat = require('../models/Seat');
const Match = require('../models/Match');
const FraudLog = require('../models/FraudLog');
const AttendanceLog = require('../models/AttendanceLog');

/**
 * Fetch all users with optional role filter.
 */
async function getUsers(role) {
  const filter = role ? { role } : {};
  return User.find(filter).select('-password').sort({ createdAt: -1 });
}

/**
 * Create a new user with a specific role (admin only).
 */
async function createUser({ name, email, password, role }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const err = new Error('A user with this email already exists');
    err.statusCode = 409;
    throw err;
  }

  const user = await User.create({ name, email, password, role });
  return user.toPublicJSON();
}

/**
 * Update user details (name, email, role, status).
 */
async function updateUser(userId, updates) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (updates.email && updates.email.toLowerCase() !== user.email) {
    const existing = await User.findOne({ email: updates.email.toLowerCase() });
    if (existing) {
      const err = new Error('Email already in use');
      err.statusCode = 409;
      throw err;
    }
  }

  if (updates.name) user.name = updates.name;
  if (updates.email) user.email = updates.email;
  if (updates.role) user.role = updates.role;
  if (updates.status) user.status = updates.status;

  await user.save();
  return user.toPublicJSON();
}

/**
 * Delete a user permanently.
 */
async function deleteUser(userId) {
  const user = await User.findByIdAndDelete(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return { id: user._id };
}

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
  const scannedTickets = await Ticket.countDocuments({ status: 'used' });
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

  // 5. Security Alert Counter (invalid/duplicate scans)
  const fraudCounts = await FraudLog.aggregate([
    { $group: { _id: '$reason', count: { $sum: 1 } } },
  ]);

  const securityAlerts = {
    duplicate_scan: 0,
    invalid_ticket: 0,
    unauthorized_attempt: 0,
  };

  fraudCounts.forEach((item) => {
    if (securityAlerts[item._id] !== undefined) {
      securityAlerts[item._id] = item.count;
    }
  });

  return {
    totalRevenue,
    salesByCategory,
    attendance: {
      totalTickets,
      scannedTickets,
      entryRate,
    },
    matchPerformance,
    securityAlerts,
  };
}

/**
 * Fetch logs representing rejected ticket check-in attempts.
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
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getAdminAnalytics,
  getFraudLogs,
};
