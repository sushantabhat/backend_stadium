const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Seat = require('../models/Seat');
const AttendanceLog = require('../models/AttendanceLog');
const FraudLog = require('../models/FraudLog');
const socketService = require('./socketService');

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Fetch tickets for the logged in Fan.
 */
async function getMyTickets(userId) {
  return Ticket.find({ user: userId })
    .populate('match')
    .populate('seat', 'seatLabel category price')
    .sort({ createdAt: -1 });
}

/**
 * Verify stadium entry code (Staff operation) and mark attendance.
 * Implements AI-level safety / fraud rules:
 * - Flags non-existent ticket codes.
 * - Flags duplicate check-in attempts.
 */
async function verifyTicket(staffId, ticketCode) {
  const trimmedCode = ticketCode?.trim();
  if (!trimmedCode) {
    throw createHttpError('Ticket code is required', 400);
  }

  // Find ticket
  const ticket = await Ticket.findOne({ ticketCode: trimmedCode })
    .populate('user', 'name email')
    .populate('match')
    .populate('seat', 'seatLabel category price');

  // Case 1: Ticket does not exist
  if (!ticket) {
    await FraudLog.create({
      ticketCode: trimmedCode,
      scannedBy: staffId,
      reason: 'invalid_ticket',
      details: `Attempted check-in with non-existent barcode: ${trimmedCode}`,
    });
    throw createHttpError('Invalid QR Code: No registered ticket found', 404);
  }

  // Case 2: Ticket already scanned
  if (ticket.scanned) {
    await FraudLog.create({
      ticketCode: trimmedCode,
      ticket: ticket._id,
      match: ticket.match?._id,
      scannedBy: staffId,
      reason: 'duplicate_scan',
      details: `Repeat scan of ticket code ${trimmedCode}. Initially scanned at ${ticket.scannedAt?.toISOString()}`,
    });
    throw createHttpError(
      `Access Denied: Duplicate scan. This ticket was already verified at ${ticket.scannedAt?.toLocaleTimeString()}`,
      409
    );
  }

  // Case 3: Successful entry verification
  ticket.scanned = true;
  ticket.scannedAt = new Date();
  ticket.scannedBy = staffId;
  await ticket.save();

  // Create attendance trail
  const log = await AttendanceLog.create({
    ticket: ticket._id,
    match: ticket.match._id,
    user: ticket.user._id,
    seat: ticket.seat._id,
    scannedBy: staffId,
    entryTime: ticket.scannedAt,
  });

  // Calculate and broadcast real-time attendance update via socket
  const matchId = ticket.match._id;
  const totalSeatsCount = await Seat.countDocuments({ match: matchId });
  const bookedSeatsCount = await Seat.countDocuments({ match: matchId, status: 'booked' });
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
    ticket,
    log,
  };
}

/**
 * Retrieve scan ledger for a staff member.
 */
async function getStaffScanHistory(staffId) {
  return AttendanceLog.find({ scannedBy: staffId })
    .populate('user', 'name')
    .populate('match')
    .populate('seat', 'seatLabel category price')
    .sort({ entryTime: -1 })
    .limit(50);
}

module.exports = {
  getMyTickets,
  verifyTicket,
  getStaffScanHistory,
};
