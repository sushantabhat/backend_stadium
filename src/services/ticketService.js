const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Seat = require('../models/Seat');
const AttendanceLog = require('../models/AttendanceLog');
const FraudLog = require('../models/FraudLog');
const AIPrediction = require('../models/AIPrediction');
const socketService = require('./socketService');
const { featureExtractors, modelRegistry } = require('./ai');

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
 * 
 * Enhanced AI-powered fraud detection:
 * - Invalid ticket codes
 * - Duplicate scan detection
 * - Behavioral anomaly detection
 * - Rapid scanning detection
 * - Risk scoring and classification
 * 
 * Architecture: ML-ready with feature extraction and prediction engine
 */
async function verifyTicket(staffId, ticketCode) {
  const startTime = Date.now();
  const trimmedCode = ticketCode?.trim();
  if (!trimmedCode) {
    throw createHttpError('Ticket code is required', 400);
  }

  // Extract fraud features
  const fraudFeatures = await featureExtractors.extractFraudFeatures(trimmedCode, staffId);

  // Get fraud prediction from model registry
  const fraudPrediction = modelRegistry.predict('fraudDetection', fraudFeatures);

  // Log prediction for analytics
  await AIPrediction.logPrediction({
    modelKey: 'fraudDetection',
    modelVersion: '1.0.0',
    ticketCode: trimmedCode,
    inputFeatures: fraudFeatures,
    prediction: fraudPrediction,
    confidence: 1 - fraudPrediction.riskScore,
    predictionTime: Date.now() - startTime,
  });

  // Case 1: Invalid ticket
  if (!fraudFeatures.isValid) {
    await FraudLog.create({
      ticketCode: trimmedCode,
      scannedBy: staffId,
      reason: 'invalid_ticket',
      details: `Attempted check-in with non-existent barcode: ${trimmedCode}. Risk Score: ${fraudPrediction.riskScore}`,
    });
    throw createHttpError('Invalid QR Code: No registered ticket found', 404);
  }

  // Case 2: Duplicate scan
  if (fraudFeatures.alreadyScanned) {
    await FraudLog.create({
      ticketCode: trimmedCode,
      ticket: fraudFeatures.ticketId,
      match: fraudFeatures.matchId,
      scannedBy: staffId,
      reason: 'duplicate_scan',
      details: `Repeat scan of ticket code ${trimmedCode}. Initially scanned at ${fraudFeatures.lastScanTime?.toISOString()}. Time since last scan: ${fraudFeatures.timeSinceLastScan?.toFixed(1)}s`,
    });
    throw createHttpError(
      `Access Denied: Duplicate scan. This ticket was already verified at ${fraudFeatures.lastScanTime?.toLocaleTimeString()}`,
      409
    );
  }

  // Case 3: Behavioral anomaly detected (medium-high risk)
  if (fraudPrediction.classification === 'high_risk' || fraudPrediction.classification === 'medium_risk') {
    await FraudLog.create({
      ticketCode: trimmedCode,
      ticket: fraudFeatures.ticketId,
      match: fraudFeatures.matchId,
      scannedBy: staffId,
      reason: 'unauthorized_attempt',
      details: `Behavioral anomaly detected. Risk Score: ${fraudPrediction.riskScore}. Flags: ${fraudPrediction.flags.join(', ')}. Scan Frequency: ${fraudFeatures.scanFrequency}/hour`,
    });

    // Still block if high risk
    if (fraudPrediction.action === 'block') {
      throw createHttpError(
        `Access Denied: Suspicious activity detected. Risk Score: ${(fraudPrediction.riskScore * 100).toFixed(0)}%`,
        403
      );
    }
  }

  // Case 4: Successful entry verification
  const ticket = await Ticket.findOne({ ticketCode: trimmedCode })
    .populate('user', 'name email')
    .populate('match')
    .populate('seat', 'seatLabel category price');

  if (!ticket) {
    throw createHttpError('Ticket not found', 404);
  }

  ticket.scanned = true;
  ticket.scannedAt = new Date();
  ticket.scannedBy = staffId;
  await ticket.save();

  if (!ticket.match || !ticket.user || !ticket.seat) {
    throw createHttpError('Ticket data is incomplete - referenced records may have been deleted', 500);
  }

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

  // Format ticket for frontend (backward compatible)
  const formattedTicket = {
    ticketCode: ticket.ticketCode,
    userName: ticket.user?.name,
    seatLabel: ticket.seat?.seatLabel,
    category: ticket.seat?.category,
    matchTitle: ticket.match?.title,
    scanned: ticket.scanned,
    scannedAt: ticket.scannedAt,
    user: ticket.user,
    seat: ticket.seat,
    match: ticket.match,
  };

  return {
    ticket: formattedTicket,
    log,
    fraudPrediction: {
      classification: fraudPrediction.classification,
      riskScore: fraudPrediction.riskScore,
      action: fraudPrediction.action,
    },
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
