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

  const salesByCategory = {};

  categorySales.forEach((item) => {
    if (!salesByCategory[item._id]) {
      salesByCategory[item._id] = { count: 0, revenue: 0 };
    }
    salesByCategory[item._id] = {
      count: item.count,
      revenue: item.revenue,
    };
  });

  // 3. Attendance Ratios
  const totalTickets = await Ticket.countDocuments();
  const scannedTickets = await Ticket.countDocuments({ status: 'used' });
  const entryRate = totalTickets > 0 ? ((scannedTickets / totalTickets) * 100).toFixed(1) : '0.0';

  // 4. Match-wise Performance Occupancy
  const matchPerformance = [];

  const seatStats = await Seat.aggregate([
    {
      $group: {
        _id: { match: '$match', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  const bookingRevenue = await Booking.aggregate([
    { $match: { status: 'confirmed' } },
    {
      $group: {
        _id: '$match',
        revenue: { $sum: '$totalAmount' },
      },
    },
  ]);

  const revenueMap = {};
  for (const b of bookingRevenue) {
    revenueMap[b._id.toString()] = b.revenue;
  }

  const seatMap = {};
  for (const s of seatStats) {
    const mid = s._id.match.toString();
    if (!seatMap[mid]) seatMap[mid] = { total: 0, booked: 0 };
    seatMap[mid].total += s.count;
    if (s._id.status === 'booked') seatMap[mid].booked += s.count;
  }

  const matches = await Match.find().lean();
  for (const match of matches) {
    const stats = seatMap[match._id.toString()] || { total: 0, booked: 0 };
    matchPerformance.push({
      matchId: match._id,
      title: match.title,
      occupancy: stats.total > 0 ? ((stats.booked / stats.total) * 100).toFixed(1) : '0.0',
      revenue: revenueMap[match._id.toString()] || 0,
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
 * Fetch all tickets across all matches for admin overview.
 */
async function getAllTickets() {
  return Ticket.find()
    .populate('match', 'title teamA teamB matchDate status')
    .populate('seat', 'seatLabel category price')
    .populate('user', 'name email')
    .populate('scannedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(100);
}

/**
 * Fetch logs representing rejected ticket check-in attempts.
 */
async function getFraudLogs(status) {
  const filter = status ? { status } : {};
  return FraudLog.find(filter)
    .populate({
      path: 'ticket',
      populate: [
        { path: 'seat', select: 'seatLabel category price' },
        { path: 'user', select: 'name email' },
      ],
    })
    .populate('match')
    .populate('scannedBy', 'name email')
    .sort({ timestamp: -1 })
    .limit(50);
}

/**
 * Fetch a single fraud log with full details.
 */
async function getFraudLogById(id) {
  const log = await FraudLog.findById(id)
    .populate({
      path: 'ticket',
      populate: [
        { path: 'seat', select: 'seatLabel category price gate' },
        { path: 'user', select: 'name email phone' },
      ],
    })
    .populate('match', 'title teamA teamB matchDate status venue')
    .populate('scannedBy', 'name email')
    .populate('resolvedBy', 'name');
  if (!log) {
    const err = new Error('Fraud log not found');
    err.statusCode = 404;
    throw err;
  }
  return log;
}

/**
 * Get all attendance logs for a given ticket.
 */
async function getAttendanceLogsForTicket(ticketId) {
  return AttendanceLog.find({ ticket: ticketId })
    .populate('scannedBy', 'name')
    .sort({ entryTime: -1 });
}

/**
 * Resolve a fraud log — dismiss or allow entry.
 */
async function resolveFraudLog(logId, resolution, notes, userId) {
  const log = await FraudLog.findById(logId);
  if (!log) {
    const err = new Error('Fraud log not found');
    err.statusCode = 404;
    throw err;
  }
  if (log.status !== 'open') {
    const err = new Error(`Fraud log is already ${log.status}`);
    err.statusCode = 409;
    throw err;
  }

  log.status = 'resolved';
  log.resolution = resolution;
  log.notes = notes || '';
  log.resolvedBy = userId;
  log.resolvedAt = new Date();
  await log.save();

  if (resolution === 'allowed' && log.ticket) {
    try {
      await AttendanceLog.create({
        ticket: log.ticket,
        match: log.match,
        scannedBy: userId,
        entryTime: new Date(),
      });
    } catch (err) {
      console.error('[resolveFraudLog] Failed to create attendance log:', err.message);
    }
  }

  return log;
}

/**
 * Escalate a fraud log to admin.
 */
async function escalateFraudLog(logId, notes, userId) {
  const log = await FraudLog.findById(logId);
  if (!log) {
    const err = new Error('Fraud log not found');
    err.statusCode = 404;
    throw err;
  }
  if (log.status !== 'open') {
    const err = new Error(`Fraud log is already ${log.status}`);
    err.statusCode = 409;
    throw err;
  }

  log.status = 'escalated';
  log.notes = notes || '';
  log.resolvedBy = userId;
  log.resolvedAt = new Date();
  await log.save();

  return log;
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getAdminAnalytics,
  getAllTickets,
  getFraudLogs,
  getFraudLogById,
  getAttendanceLogsForTicket,
  resolveFraudLog,
  escalateFraudLog,
};
