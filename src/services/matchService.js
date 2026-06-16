const mongoose = require('mongoose');
const Match = require('../models/Match');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function buildSeatDocuments(match) {
  const { rows, seatsPerRow, vipRows, premiumRows } = match.seatLayout;
  const seats = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const rowLabel = String.fromCharCode(65 + rowIndex);
    let category = 'general';

    if (rowIndex < vipRows) {
      category = 'vip';
    } else if (rowIndex < vipRows + premiumRows) {
      category = 'premium';
    }

    const price = match.pricing[category];

    for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber += 1) {
      seats.push({
        match: match._id,
        seatLabel: `${rowLabel}-${seatNumber}`,
        row: rowLabel,
        number: seatNumber,
        category,
        price,
        status: 'available',
      });
    }
  }

  return seats;
}

async function getSeatStats(matchId) {
  const objectId = new mongoose.Types.ObjectId(matchId);

  const stats = await Seat.aggregate([
    { $match: { match: objectId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        available: {
          $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] },
        },
        locked: {
          $sum: { $cond: [{ $eq: ['$status', 'locked'] }, 1, 0] },
        },
        booked: {
          $sum: { $cond: [{ $eq: ['$status', 'booked'] }, 1, 0] },
        },
        vip: {
          $sum: { $cond: [{ $eq: ['$category', 'vip'] }, 1, 0] },
        },
        premium: {
          $sum: { $cond: [{ $eq: ['$category', 'premium'] }, 1, 0] },
        },
        general: {
          $sum: { $cond: [{ $eq: ['$category', 'general'] }, 1, 0] },
        },
      },
    },
  ]);

  const result = stats[0] || {};

  return {
    total: result.total || 0,
    available: result.available || 0,
    locked: result.locked || 0,
    booked: result.booked || 0,
    vip: result.vip || 0,
    premium: result.premium || 0,
    general: result.general || 0,
  };
}

function formatMatch(match, seatStats) {
  return {
    _id: match._id,
    id: match._id,
    title: match.title,
    teamA: match.teamA,
    teamB: match.teamB,
    venue: match.venue,
    matchDate: match.matchDate,
    description: match.description,
    status: match.status,
    pricing: match.pricing,
    seatLayout: match.seatLayout,
    totalSeats: match.totalSeats,
    createdBy: match.createdBy,
    seatStats,
    createdAt: match.createdAt,
    updatedAt: match.updatedAt,
  };
}

async function createMatch(adminId, payload) {
  const { rows, seatsPerRow, vipRows, premiumRows } = payload.seatLayout;

  if (vipRows + premiumRows > rows) {
    throw createHttpError('VIP rows + Premium rows cannot exceed total rows', 400);
  }

  const match = await Match.create({
    ...payload,
    createdBy: adminId,
    totalSeats: rows * seatsPerRow,
  });

  const seatDocuments = buildSeatDocuments(match);
  await Seat.insertMany(seatDocuments);

  const seatStats = await getSeatStats(match._id);
  return formatMatch(match, seatStats);
}

async function listMatches({ includeAll = false } = {}) {
  const filter = includeAll
    ? {}
    : { status: { $in: ['upcoming', 'live'] } };

  const matches = await Match.find(filter).sort({ matchDate: 1 }).lean();

  const formattedMatches = await Promise.all(
    matches.map(async (match) => {
      const seatStats = await getSeatStats(match._id);
      return formatMatch(match, seatStats);
    })
  );

  return formattedMatches;
}

async function getMatchById(matchId) {
  if (!matchId || !mongoose.Types.ObjectId.isValid(matchId)) {
    throw createHttpError('Invalid match ID', 400);
  }
  const match = await Match.findById(matchId).populate('createdBy', 'name email');

  if (!match) {
    throw createHttpError('Match not found', 404);
  }

  const seatStats = await getSeatStats(match._id);
  return formatMatch(match, seatStats);
}

async function getMatchSeats(matchId, { category } = {}) {
  const match = await Match.findById(matchId);

  if (!match) {
    throw createHttpError('Match not found', 404);
  }

  const filter = { match: matchId };
  if (category) {
    filter.category = category;
  }

  const seats = await Seat.find(filter).sort({ row: 1, number: 1 }).lean();

  const now = new Date();
  return seats.map((seat) => {
    // Treat expired locks as available
    let status = seat.status;
    if (status === 'locked' && seat.lockedUntil && seat.lockedUntil < now) {
      status = 'available';
    }

    return {
      id: seat._id,
      seatLabel: seat.seatLabel,
      row: seat.row,
      number: seat.number,
      category: seat.category,
      price: seat.price,
      status,
    };
  });
}

async function updateMatch(matchId, updates) {
  const match = await Match.findById(matchId);

  if (!match) {
    throw createHttpError('Match not found', 404);
  }

  const allowedFields = ['title', 'teamA', 'teamB', 'venue', 'matchDate', 'description', 'status'];
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      match[field] = updates[field];
    }
  });

  await match.save();

  const seatStats = await getSeatStats(match._id);
  return formatMatch(match, seatStats);
}

async function cancelMatch(matchId) {
  const match = await Match.findById(matchId);

  if (!match) {
    throw createHttpError('Match not found', 404);
  }

  match.status = 'cancelled';
  await match.save();

  // Cascade: cancel all confirmed/pending bookings for this match
  const bookingsResult = await Booking.updateMany(
    { match: matchId, status: { $in: ['confirmed', 'pending'] } },
    { status: 'cancelled' }
  );

  // Cascade: release all locked/booked seats back to available
  const seatsResult = await Seat.updateMany(
    { match: matchId, status: { $in: ['locked', 'booked'] } },
    { status: 'available', lockedBy: null, lockedUntil: null }
  );

  const seatStats = await getSeatStats(match._id);
  return {
    ...formatMatch(match, seatStats),
    cancelledBookings: bookingsResult.modifiedCount,
    releasedSeats: seatsResult.modifiedCount,
  };
}

module.exports = {
  createMatch,
  listMatches,
  getMatchById,
  getMatchSeats,
  updateMatch,
  cancelMatch,
};
