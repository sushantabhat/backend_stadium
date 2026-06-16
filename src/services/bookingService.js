const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Seat = require('../models/Seat');
const Match = require('../models/Match');
const socketService = require('./socketService');

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Check if a seat's lock has expired.
 */
function isLockExpired(seat) {
  return seat.status === 'locked' && seat.lockedUntil && seat.lockedUntil < new Date();
}

/**
 * Lock selected seats for a user (Expires in 5 minutes).
 */
async function lockSeats(userId, matchId, seatIds) {
  if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    throw createHttpError('Seats are required', 400);
  }

  const match = await Match.findById(matchId);
  if (!match) {
    throw createHttpError('Match not found', 404);
  }

  const now = new Date();
  const lockDuration = 5 * 60 * 1000; // 5 minutes
  const lockedUntil = new Date(now.getTime() + lockDuration);

  // Perform checks and update in a loop or bulk operation
  // To avoid race conditions, we can find seats that are:
  // - available
  // - OR locked but lock is expired
  // - OR locked by the SAME user
  const seats = await Seat.find({
    _id: { $in: seatIds },
    match: matchId,
  });

  if (seats.length !== seatIds.length) {
    throw createHttpError('One or more selected seats do not exist for this match', 400);
  }

  // Validate each seat - expired locks are treated as available
  for (const seat of seats) {
    // Auto-release expired locks
    if (isLockExpired(seat)) {
      seat.status = 'available';
      seat.lockedBy = null;
      seat.lockedUntil = null;
      await seat.save();
    }

    const isLockedByOther =
      seat.status === 'locked' &&
      seat.lockedUntil &&
      seat.lockedUntil > now &&
      seat.lockedBy?.toString() !== userId;

    if (seat.status === 'booked' || isLockedByOther) {
      throw createHttpError(`Seat ${seat.seatLabel} is already booked or held by another user`, 409);
    }
  }

  // Lock seats
  const updatedSeats = [];
  for (const seat of seats) {
    seat.status = 'locked';
    seat.lockedBy = userId;
    seat.lockedUntil = lockedUntil;
    await seat.save();

    updatedSeats.push(seat);

    // Emit live seat status update via Socket.io
    socketService.emitSeatUpdate(matchId, {
      id: seat._id,
      seatLabel: seat.seatLabel,
      category: seat.category,
      price: seat.price,
      status: 'locked',
      lockedBy: userId,
      lockedUntil: lockedUntil,
    });
  }

  return updatedSeats;
}

/**
 * Unlock seats (if user cancels or leaves selection).
 */
async function unlockSeats(userId, matchId, seatIds) {
  if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    return [];
  }

  const seats = await Seat.find({
    _id: { $in: seatIds },
    match: matchId,
    lockedBy: userId,
  });

  const updatedSeats = [];
  for (const seat of seats) {
    seat.status = 'available';
    seat.lockedBy = null;
    seat.lockedUntil = null;
    await seat.save();

    updatedSeats.push(seat);

    // Emit live seat status update via Socket.io
    socketService.emitSeatUpdate(matchId, {
      id: seat._id,
      seatLabel: seat.seatLabel,
      category: seat.category,
      price: seat.price,
      status: 'available',
      lockedBy: null,
      lockedUntil: null,
    });
  }

  return updatedSeats;
}

/**
 * Confirm booking, process payment, generate tickets, mark seats as booked.
 */
async function confirmBooking(userId, matchId, seatIds) {
  if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    throw createHttpError('Seats are required', 400);
  }

  const match = await Match.findById(matchId);
  if (!match) {
    throw createHttpError('Match not found', 404);
  }

  const now = new Date();

  // Find seats that are locked by this user OR available (if lock expired but not taken)
  const seats = await Seat.find({
    _id: { $in: seatIds },
    match: matchId,
  });

  if (seats.length !== seatIds.length) {
    throw createHttpError('One or more selected seats do not exist for this match', 400);
  }

  // Validate seats before booking - expired locks are treated as available
  for (const seat of seats) {
    // Auto-release expired locks
    if (isLockExpired(seat)) {
      seat.status = 'available';
      seat.lockedBy = null;
      seat.lockedUntil = null;
      await seat.save();
    }

    const isLockedByOther =
      seat.status === 'locked' &&
      seat.lockedUntil &&
      seat.lockedUntil > now &&
      seat.lockedBy?.toString() !== userId;

    if (seat.status === 'booked' || isLockedByOther) {
      throw createHttpError(`Seat ${seat.seatLabel} is not available for booking`, 409);
    }
  }

  // Calculate total amount server-side from actual seat prices (never trust client)
  const totalAmount = seats.reduce((sum, seat) => sum + seat.price, 0);

  // Create booking record
  const booking = await Booking.create({
    user: userId,
    match: matchId,
    seats: seatIds,
    totalAmount,
    status: 'confirmed',
  });

  const tickets = [];

  // Mark seats as booked and generate tickets
  for (const seat of seats) {
    seat.status = 'booked';
    seat.lockedBy = null;
    seat.lockedUntil = null;
    await seat.save();

    // Generate unique ticket verification code (e.g. STADIUM-MATCHID-SEATID-RANDOM)
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const ticketCode = `TKT-${matchId.toString().substring(18)}-${seat.seatLabel}-${randomSuffix}`;

    const ticket = await Ticket.create({
      booking: booking._id,
      user: userId,
      match: matchId,
      seat: seat._id,
      ticketCode,
    });

    tickets.push(ticket);

    // Emit live seat status update via Socket.io
    socketService.emitSeatUpdate(matchId, {
      id: seat._id,
      seatLabel: seat.seatLabel,
      category: seat.category,
      price: seat.price,
      status: 'booked',
      lockedBy: null,
      lockedUntil: null,
    });
  }

  // Calculate and trigger live attendance analytics sync via Socket.io
  const stats = await Seat.aggregate([
    { $match: { match: new mongoose.Types.ObjectId(matchId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        booked: { $sum: { $cond: [{ $eq: ['$status', 'booked'] }, 1, 0] } },
      },
    },
  ]);

  const totalSeatsCount = stats[0]?.total || 0;
  const bookedSeatsCount = stats[0]?.booked || 0;

  // Fetch current attendance count (actual scanned entries)
  const attendedCount = await Ticket.countDocuments({ match: matchId, scanned: true });
  const entryRate = bookedSeatsCount > 0 ? ((attendedCount / bookedSeatsCount) * 100).toFixed(1) : '0.0';

  socketService.emitAttendanceUpdate(matchId, {
    matchId,
    totalSeats: totalSeatsCount,
    bookedSeats: bookedSeatsCount,
    attendedCount,
    entryRate,
  });

  return {
    booking,
    tickets,
  };
}

/**
 * Fetch currently logged in user's bookings.
 */
async function getMyBookings(userId) {
  return Booking.find({ user: userId })
    .populate('match')
    .populate({
      path: 'seats',
      select: 'seatLabel category price',
    })
    .sort({ createdAt: -1 });
}

module.exports = {
  lockSeats,
  unlockSeats,
  confirmBooking,
  getMyBookings,
};
