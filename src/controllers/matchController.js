const matchService = require('../services/matchService');

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseMatchDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError('Invalid match date format', 400);
  }
  return date;
}

function validateCreatePayload(body) {
  const requiredStrings = ['title', 'teamA', 'teamB', 'venue'];
  requiredStrings.forEach((field) => {
    if (!body[field] || !String(body[field]).trim()) {
      throw createHttpError(`${field} is required`, 400);
    }
  });

  if (!body.matchDate) {
    throw createHttpError('matchDate is required', 400);
  }

  const pricing = body.pricing || {};
  ['vip', 'premium', 'general'].forEach((tier) => {
    const value = Number(pricing[tier]);
    if (Number.isNaN(value) || value < 0) {
      throw createHttpError(`pricing.${tier} must be a valid number`, 400);
    }
  });

  const layout = body.seatLayout || {};
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

  if (vipRows < 0 || premiumRows < 0) {
    throw createHttpError('VIP and Premium rows cannot be negative', 400);
  }

  return {
    title: body.title.trim(),
    teamA: body.teamA.trim(),
    teamB: body.teamB.trim(),
    venue: body.venue.trim(),
    matchDate: parseMatchDate(body.matchDate),
    description: body.description?.trim() || '',
    imageUrl: body.imageUrl?.trim() || '',
    teamALogo: body.teamALogo?.trim() || '',
    teamBLogo: body.teamBLogo?.trim() || '',
    pricing: {
      vip: Number(pricing.vip),
      premium: Number(pricing.premium),
      general: Number(pricing.general),
    },
    seatLayout: {
      rows,
      seatsPerRow,
      vipRows,
      premiumRows,
    },
  };
}

async function createMatch(req, res, next) {
  try {
    const payload = validateCreatePayload(req.body);
    const match = await matchService.createMatch(req.user.id, payload);

    res.status(201).json({
      message: 'Match created successfully',
      match,
    });
  } catch (error) {
    next(error);
  }
}

async function listMatches(req, res, next) {
  try {
    const includeAll = req.user.role === 'admin' && req.query.all === 'true';
    const matches = await matchService.listMatches({ includeAll });

    res.status(200).json({ matches });
  } catch (error) {
    next(error);
  }
}

async function getMatch(req, res, next) {
  try {
    const match = await matchService.getMatchById(req.params.id);
    res.status(200).json({ match });
  } catch (error) {
    next(error);
  }
}

async function getMatchSeats(req, res, next) {
  try {
    const seats = await matchService.getMatchSeats(req.params.id, {
      category: req.query.category,
    });

    res.status(200).json({ seats });
  } catch (error) {
    next(error);
  }
}

async function updateMatch(req, res, next) {
  try {
    const updates = { ...req.body };

    if (updates.matchDate) {
      updates.matchDate = parseMatchDate(updates.matchDate);
    }

    const match = await matchService.updateMatch(req.params.id, updates);

    res.status(200).json({
      message: 'Match updated successfully',
      match,
    });
  } catch (error) {
    next(error);
  }
}

async function cancelMatch(req, res, next) {
  try {
    const match = await matchService.cancelMatch(req.params.id);

    res.status(200).json({
      message: 'Match cancelled successfully',
      match,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createMatch,
  listMatches,
  getMatch,
  getMatchSeats,
  updateMatch,
  cancelMatch,
};
