const mongoose = require('mongoose');
const Match = require('../models/Match');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const { SEAT_CATEGORIES } = require('../models/Seat');

const GATE_RULES = [
  { keywords: ['supporters'], gate: 'Supporters Entrance' },
  { keywords: ['north'], gate: 'North Gate' },
  { keywords: ['south'], gate: 'South Gate' },
  { keywords: ['east'], gate: 'East Gate' },
  { keywords: ['west'], gate: 'West Gate' },
];

function inferGate(section) {
  if (section.gate) return section.gate;
  const label = ((section.label || '') + ' ' + (section.sectionId || '')).toLowerCase();
  for (const rule of GATE_RULES) {
    if (rule.keywords.some((k) => label.includes(k))) return rule.gate;
  }
  return '';
}

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function buildSeatDocuments(match) {
  const seats = [];

  if (match.stadiumSections && match.stadiumSections.length > 0) {
    for (const section of match.stadiumSections) {
      let rows = section.rows || [];
      if (!rows.length) {
        const numRows = Math.ceil(section.totalSeats / 8);
        rows = Array.from({ length: Math.max(numRows, 1) }, (_, i) => String.fromCharCode(65 + i));
      }
      const base = Math.floor(section.totalSeats / rows.length);
      const extra = section.totalSeats % rows.length;

      const gate = inferGate(section);

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
        const rowLabel = rows[rowIndex];
        const price = section.pricePerTicket || 0;
        const seatsInRow = rowIndex < extra ? base + 1 : base;

        for (let seatNumber = 1; seatNumber <= seatsInRow; seatNumber += 1) {
          seats.push({
            match: match._id,
            sectionId: section.sectionId,
            gate,
            seatLabel: `${section.sectionId}-${rowLabel}-${seatNumber}`,
            row: rowLabel,
            number: seatNumber,
            category: section.category,
            price,
            status: 'available',
          });
        }
      }
    }
  } else if (match.seatLayout) {
    const { rows, seatsPerRow, vipRows, premiumRows } = match.seatLayout;

    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      const rowLabel = String.fromCharCode(65 + rowIndex);
      let category = 'silver';

      if (rowIndex < vipRows) {
        category = 'platinum';
      } else if (rowIndex < vipRows + premiumRows) {
        category = 'gold';
      }

      const price = match.pricing?.[category] || 0;

      for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber += 1) {
        seats.push({
          match: match._id,
          sectionId: null,
          seatLabel: `${rowLabel}-${seatNumber}`,
          row: rowLabel,
          number: seatNumber,
          category,
          price,
          status: 'available',
        });
      }
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
      },
    },
  ]);

  const categoryStats = await Seat.aggregate([
    { $match: { match: objectId } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        available: {
          $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] },
        },
        booked: {
          $sum: { $cond: [{ $eq: ['$status', 'booked'] }, 1, 0] },
        },
      },
    },
  ]);

  const result = stats[0] || {};
  const categoryMap = {};
  categoryStats.forEach((cs) => {
    categoryMap[cs._id] = cs.count;
    categoryMap[`${cs._id}_available`] = cs.available;
    categoryMap[`${cs._id}_booked`] = cs.booked;
  });

  return {
    total: result.total || 0,
    available: result.available || 0,
    locked: result.locked || 0,
    booked: result.booked || 0,
    ...categoryMap,
  };
}

function formatMatch(match, seatStats) {
  const pricingObj = match.pricing instanceof Map
    ? Object.fromEntries(match.pricing)
    : match.pricing || {};

  return {
    _id: match._id,
    id: match._id,
    title: match.title,
    teamA: match.teamA,
    teamB: match.teamB,
    venue: match.venue,
    matchDate: match.matchDate,
    description: match.description,
    imageUrl: match.imageUrl || '',
    teamALogo: match.teamALogo || '',
    teamBLogo: match.teamBLogo || '',
    status: match.status,
    pricing: pricingObj,
    stadiumSections: match.stadiumSections || [],
    seatLayout: match.seatLayout,
    totalSeats: match.totalSeats,
    createdBy: match.createdBy,
    seatStats,
    createdAt: match.createdAt,
    updatedAt: match.updatedAt,
  };
}

function parsePricing(pricing) {
  if (!pricing) return {};
  const result = {};
  const entries = pricing instanceof Map ? pricing.entries() : Object.entries(pricing);
  for (const [key, value] of entries) {
    const num = Number(value);
    if (!Number.isNaN(num) && num >= 0) {
      result[key] = num;
    }
  }
  return result;
}

async function createMatch(adminId, payload) {
  const pricing = parsePricing(payload.pricing);
  let totalSeats = 0;

  if (payload.stadiumSections && payload.stadiumSections.length > 0) {
    for (const section of payload.stadiumSections) {
      totalSeats += section.totalSeats || 0;
    }
  } else if (payload.seatLayout) {
    const { rows, seatsPerRow } = payload.seatLayout;
    totalSeats = rows * seatsPerRow;
  }

  const match = await Match.create({
    ...payload,
    pricing,
    createdBy: adminId,
    totalSeats,
  });

  const seatDocuments = buildSeatDocuments(match);
  if (seatDocuments.length > 0) {
    await Seat.insertMany(seatDocuments);
  }

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

async function getMatchSeats(matchId, { category, sectionId } = {}) {
  const match = await Match.findById(matchId);

  if (!match) {
    throw createHttpError('Match not found', 404);
  }

  const filter = { match: matchId };
  if (category) filter.category = category;
  if (sectionId) filter.sectionId = sectionId;

  const seats = await Seat.find(filter).sort({ row: 1, number: 1 }).lean();

  const sectionGateMap = {};
  if (match.stadiumSections) {
    for (const sec of match.stadiumSections) {
      sectionGateMap[sec.sectionId] = inferGate(sec);
    }
  }

  const now = new Date();
  return seats.map((seat) => {
    let status = seat.status;
    if (status === 'locked' && seat.lockedUntil && seat.lockedUntil < now) {
      status = 'available';
    }

    const pricingObj = match.pricing instanceof Map
      ? Object.fromEntries(match.pricing)
      : match.pricing || {};

    const gate = seat.gate || sectionGateMap[seat.sectionId] || '';
    return {
      id: seat._id,
      sectionId: seat.sectionId,
      gate,
      seatLabel: seat.seatLabel,
      row: seat.row,
      number: seat.number,
      category: seat.category,
      price: pricingObj[seat.category] ?? seat.price,
      status,
    };
  });
}

async function updateMatch(matchId, updates) {
  const match = await Match.findById(matchId);

  if (!match) {
    throw createHttpError('Match not found', 404);
  }

  const allowedFields = ['title', 'teamA', 'teamB', 'venue', 'matchDate', 'description', 'status', 'imageUrl', 'teamALogo', 'teamBLogo'];
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      match[field] = updates[field];
    }
  });

  if (updates.pricing) {
    const parsedPricing = parsePricing(updates.pricing);
    match.pricing = parsedPricing;

    const bulkOps = [];
    for (const [category, price] of Object.entries(parsedPricing)) {
      const finalPrice = Number(price);
      if (Number.isNaN(finalPrice) || finalPrice < 0) continue;
      bulkOps.push({
        updateMany: {
          filter: { match: matchId, category, status: 'available' },
          update: { price: finalPrice },
        },
      });
    }

    if (bulkOps.length > 0) {
      await Seat.bulkWrite(bulkOps);
    }
  }

  let seatsRegenerated = false;

  if (updates.stadiumSections) {
    const bookedOrLocked = await Seat.countDocuments({
      match: matchId,
      status: { $in: ['booked', 'locked'] },
    });

    if (bookedOrLocked > 0) {
      throw createHttpError(
        `Cannot modify stadium layout: ${bookedOrLocked} seat(s) are booked or locked.`,
        400
      );
    }

    match.stadiumSections = updates.stadiumSections;
    match.totalSeats = updates.stadiumSections.reduce((sum, s) => sum + (s.totalSeats || 0), 0);

    await Seat.deleteMany({ match: matchId });
    const seatDocuments = buildSeatDocuments(match);
    if (seatDocuments.length > 0) {
      await Seat.insertMany(seatDocuments);
    }
    seatsRegenerated = true;
  } else if (updates.seatLayout) {
    const bookedOrLocked = await Seat.countDocuments({
      match: matchId,
      status: { $in: ['booked', 'locked'] },
    });

    if (bookedOrLocked > 0) {
      throw createHttpError(
        `Cannot modify seat layout: ${bookedOrLocked} seat(s) are booked or locked.`,
        400
      );
    }

    const layout = updates.seatLayout;
    const rows = Number(layout.rows);
    const seatsPerRow = Number(layout.seatsPerRow);
    const vipRows = Number(layout.vipRows ?? 0);
    const premiumRows = Number(layout.premiumRows ?? 0);

    if (!rows || rows < 1 || rows > 30) {
      throw createHttpError('seatLayout.rows must be between 1 and 30', 400);
    }
    if (!seatsPerRow || seatsPerRow < 1 || seatsPerRow > 50) {
      throw createHttpError('seatLayout.seatsPerRow must be between 1 and 50', 400);
    }

    match.seatLayout = { rows, seatsPerRow, vipRows, premiumRows };
    match.totalSeats = rows * seatsPerRow;

    await Seat.deleteMany({ match: matchId });
    const seatDocuments = buildSeatDocuments(match);
    if (seatDocuments.length > 0) {
      await Seat.insertMany(seatDocuments);
    }
    seatsRegenerated = true;
  }

  await match.save();

  const seatStats = await getSeatStats(match._id);
  return { ...formatMatch(match, seatStats), seatsRegenerated };
}

async function cancelMatch(matchId) {
  const match = await Match.findById(matchId);

  if (!match) {
    throw createHttpError('Match not found', 404);
  }

  match.status = 'cancelled';
  await match.save();

  const Ticket = require('../models/Ticket');

  const bookingsResult = await Booking.updateMany(
    { match: matchId, status: { $in: ['confirmed', 'pending'] } },
    { status: 'cancelled' }
  );

  const ticketsResult = await Ticket.updateMany(
    { match: matchId, status: 'active' },
    { status: 'used', usedAt: new Date() }
  );

  const seatsResult = await Seat.updateMany(
    { match: matchId, status: { $in: ['locked', 'booked'] } },
    { status: 'available', lockedBy: null, lockedUntil: null }
  );

  const seatStats = await getSeatStats(match._id);
  return {
    ...formatMatch(match, seatStats),
    cancelledBookings: bookingsResult.modifiedCount,
    invalidatedTickets: ticketsResult.modifiedCount,
    releasedSeats: seatsResult.modifiedCount,
  };
}

module.exports = {
  buildSeatDocuments,
  createMatch,
  listMatches,
  getMatchById,
  getMatchSeats,
  updateMatch,
  cancelMatch,
};
