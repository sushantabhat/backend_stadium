const Ticket = require('../models/Ticket');
const Seat = require('../models/Seat');
const AttendanceLog = require('../models/AttendanceLog');
const socketService = require('./socketService');

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function formatNepalTime(date) {
  if (!date) return 'unknown';
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kathmandu',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(date));
  } catch {
    return 'unknown';
  }
}

/**
 * Fetch tickets for the logged-in fan.
 */
async function getMyTickets(userId) {
  return Ticket.find({ user: userId })
    .populate('match')
    .populate('seat', 'seatLabel category price gate')
    .sort({ createdAt: -1 });
}

/**
 * Find a ticket by code (exact match first, case-insensitive fallback).
 * Returns the ticket document or null.
 */
async function findTicketByCode(code) {
  const exact = await Ticket.findOne({ ticketCode: code });
  if (exact) return exact;

  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const codeRegex = new RegExp(`^${escaped}$`, 'i');
  return Ticket.findOne({ ticketCode: { $regex: codeRegex } });
}

/**
 * Verify a ticket for stadium entry (Staff operation).
 *
 * Rule-based validation (deterministic):
 *   1. Ticket code must be provided           → 400
 *   2. Ticket must exist in the database      → 404
 *   3. Ticket status must be "active"         → 409 (already used)
 *   4. Atomically mark as "used"              → prevents race conditions
 *   5. Create attendance log entry
 *   6. Broadcast real-time attendance update
 */
async function verifyTicket(staffId, ticketCode) {
  const trimmedCode = ticketCode?.trim();
  if (!trimmedCode) {
    throw createHttpError('Ticket code is required', 400);
  }

  console.log(`[TicketVerify] START staffId=${staffId} code="${trimmedCode}"`);

  // Step 1: Find the ticket first (read-only) to determine its state.
  // This avoids the race condition where findOneAndUpdate atomically marks
  // a ticket as "used" before we can check its original status.
  const existingTicket = await findTicketByCode(trimmedCode);

  if (!existingTicket) {
    console.log(`[TicketVerify] NOT FOUND code="${trimmedCode}"`);
    throw createHttpError('Ticket not found. Invalid QR code.', 404);
  }

  if (existingTicket.status === 'used') {
    console.log(`[TicketVerify] ALREADY USED code="${trimmedCode}" usedAt=${existingTicket.usedAt}`);
    try {
      const FraudLog = require('../models/FraudLog');
      await FraudLog.create({
        ticketCode: trimmedCode,
        ticket: existingTicket._id,
        match: existingTicket.match,
        scannedBy: staffId,
        reason: 'duplicate_scan',
        details: `Duplicate scan attempt at ${formatNepalTime(new Date())}. Original entry at ${formatNepalTime(existingTicket.usedAt)}.`,
      });
    } catch (fraudErr) {
      console.error('[TicketVerify] Fraud log write failed (non-fatal):', fraudErr.message);
    }
    throw createHttpError(
      `Ticket already used at ${formatNepalTime(existingTicket.usedAt)}. Duplicate entry denied.`,
      409
    );
  }

  // Step 2: Ticket is active — atomically mark as "used".
  // Use the exact ticketCode from the DB to ensure exact match.
  const ticket = await Ticket.findOneAndUpdate(
    { _id: existingTicket._id, status: 'active' },
    {
      $set: {
        status: 'used',
        usedAt: new Date(),
        scannedBy: staffId,
      },
    },
    { new: true }
  )
    .populate('user', 'name email')
    .populate('match')
    .populate('seat', 'seatLabel category price gate');

  // Handle race condition: another request marked it as "used" between
  // our read and write. This should be extremely rare but we handle it.
  if (!ticket) {
    console.log(`[TicketVerify] RACE CONDITION code="${trimmedCode}" — ticket was marked used between read and write`);
    const raceTicket = await Ticket.findById(existingTicket._id);
    throw createHttpError(
      `Ticket already used at ${formatNepalTime(raceTicket?.usedAt)}. Duplicate entry denied.`,
      409
    );
  }

  console.log(`[TicketVerify] SUCCESS code="${trimmedCode}" user=${ticket.user?.name || 'Unknown'} seat=${ticket.seat?.seatLabel || 'N/A'}`);

  // Step 3: Create attendance log
  let log = null;
  try {
    log = await AttendanceLog.create({
      ticket: ticket._id,
      match: ticket.match?._id || ticket.match,
      user: ticket.user?._id || ticket.user,
      seat: ticket.seat?._id || ticket.seat,
      scannedBy: staffId,
      entryTime: ticket.usedAt,
    });
    console.log(`[TicketVerify] LOG CREATED logId=${log._id}`);
  } catch (logErr) {
    console.error(`[TicketVerify] LOG FAILED code="${trimmedCode}" error=${logErr.message}`);
  }

  // Step 4: Broadcast real-time attendance update
  const matchId = ticket.match?._id || ticket.match;
  if (matchId) {
    try {
      const totalSeatsCount = await Seat.countDocuments({ match: matchId });
      const bookedSeatsCount = await Seat.countDocuments({ match: matchId, status: 'booked' });
      const attendedCount = await Ticket.countDocuments({ match: matchId, status: 'used' });
      const entryRate = bookedSeatsCount > 0 ? ((attendedCount / bookedSeatsCount) * 100).toFixed(1) : '0.0';

      socketService.emitAttendanceUpdate(matchId, {
        matchId,
        totalSeats: totalSeatsCount,
        bookedSeats: bookedSeatsCount,
        attendedCount,
        entryRate,
      });
    } catch (broadcastErr) {
      console.error('[TicketVerify] Broadcast error (non-fatal):', broadcastErr.message);
    }
  }

  return {
    ticket: {
      ticketCode: ticket.ticketCode,
      userName: ticket.user?.name || 'Unknown Fan',
      seatLabel: ticket.seat?.seatLabel || 'N/A',
      category: ticket.seat?.category || 'general',
      matchTitle: ticket.match?.title || 'Unknown Match',
      status: ticket.status,
      usedAt: ticket.usedAt,
      user: ticket.user,
      seat: ticket.seat,
      match: ticket.match,
    },
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
    .populate('seat', 'seatLabel category price gate')
    .sort({ entryTime: -1 })
    .limit(50);
}

module.exports = {
  getMyTickets,
  verifyTicket,
  getStaffScanHistory,
};
