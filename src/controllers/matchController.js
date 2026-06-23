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
  const pricingEntries = pricing instanceof Map ? Object.fromEntries(pricing) : pricing;
  for (const [key, value] of Object.entries(pricingEntries)) {
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) {
      throw createHttpError(`pricing.${key} must be a valid number`, 400);
    }
  }

  const result = {
    title: body.title.trim(),
    teamA: body.teamA.trim(),
    teamB: body.teamB.trim(),
    venue: body.venue.trim(),
    matchDate: parseMatchDate(body.matchDate),
    description: body.description?.trim() || '',
    imageUrl: body.imageUrl?.trim() || '',
    teamALogo: body.teamALogo?.trim() || '',
    teamBLogo: body.teamBLogo?.trim() || '',
    pricing: pricingEntries,
  };

  if (body.stadiumSections && Array.isArray(body.stadiumSections) && body.stadiumSections.length > 0) {
    result.stadiumSections = body.stadiumSections.map((s, i) => {
      if (!s.sectionId || !String(s.sectionId).trim()) {
        throw createHttpError(`stadiumSections[${i}].sectionId is required`, 400);
      }
      if (!s.category) {
        throw createHttpError(`stadiumSections[${i}].category is required`, 400);
      }
      if (!s.totalSeats || s.totalSeats < 1) {
        throw createHttpError(`stadiumSections[${i}].totalSeats must be >= 1`, 400);
      }
      const price = Number(s.pricePerTicket);
      if (Number.isNaN(price) || price < 0) {
        throw createHttpError(`stadiumSections[${i}].pricePerTicket must be a valid number`, 400);
      }
      return {
        sectionId: String(s.sectionId).trim(),
        category: s.category,
        label: s.label || s.sectionId,
        color: s.color || '#888888',
        polygon: s.polygon || '',
        labelX: Number(s.labelX) || 0,
        labelY: Number(s.labelY) || 0,
        pricePerTicket: price,
        totalSeats: Number(s.totalSeats),
        availableSeats: s.availableSeats != null ? Number(s.availableSeats) : Number(s.totalSeats),
        rows: Array.isArray(s.rows) ? s.rows : [],
        gate: s.gate || '',
      };
    });
  } else {
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

    result.seatLayout = { rows, seatsPerRow, vipRows, premiumRows };
  }

  if (body.venueGates && Array.isArray(body.venueGates)) {
    result.venueGates = body.venueGates;
  }

  return result;
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
      sectionId: req.query.sectionId,
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

    if (updates.title) updates.title = String(updates.title).trim();
    if (updates.teamA) updates.teamA = String(updates.teamA).trim();
    if (updates.teamB) updates.teamB = String(updates.teamB).trim();
    if (updates.venue) updates.venue = String(updates.venue).trim();
    if (updates.description !== undefined) updates.description = String(updates.description).trim();
    if (updates.imageUrl !== undefined) updates.imageUrl = String(updates.imageUrl).trim();
    if (updates.teamALogo !== undefined) updates.teamALogo = String(updates.teamALogo).trim();
    if (updates.teamBLogo !== undefined) updates.teamBLogo = String(updates.teamBLogo).trim();

    if (updates.pricing) {
      const pricing = updates.pricing;
      updates.pricing = pricing instanceof Map ? Object.fromEntries(pricing) : pricing;
    }

    if (updates.stadiumSections) {
      const validated = [];
      for (let i = 0; i < updates.stadiumSections.length; i++) {
        const s = updates.stadiumSections[i];
        if (!s.sectionId || !String(s.sectionId).trim()) {
          throw createHttpError(`stadiumSections[${i}].sectionId is required`, 400);
        }
        if (!s.category) {
          throw createHttpError(`stadiumSections[${i}].category is required`, 400);
        }
        const validCategories = ['platinum', 'gold', 'silver', 'bronze', 'general', 'supporters', 'category1', 'category2', 'category3', 'category4'];
        if (!validCategories.includes(s.category)) {
          throw createHttpError(`stadiumSections[${i}].category must be one of: ${validCategories.join(', ')}`, 400);
        }
        if (s.totalSeats == null || Number(s.totalSeats) < 1) {
          throw createHttpError(`stadiumSections[${i}].totalSeats must be at least 1`, 400);
        }
        if (s.pricePerTicket == null || Number(s.pricePerTicket) < 0) {
          throw createHttpError(`stadiumSections[${i}].pricePerTicket must be a non-negative number`, 400);
        }
        validated.push({
          sectionId: String(s.sectionId).trim(),
          category: s.category,
          label: s.label || s.sectionId,
          color: s.color || '#888888',
          polygon: s.polygon || '',
          labelX: Number(s.labelX) || 0,
          labelY: Number(s.labelY) || 0,
          pricePerTicket: Number(s.pricePerTicket) || 0,
          totalSeats: Number(s.totalSeats) || 0,
          availableSeats: s.availableSeats != null ? Number(s.availableSeats) : (Number(s.totalSeats) || 0),
          rows: (s.rows || []).map((r) => String(r).trim()).filter(Boolean),
          gate: s.gate || '',
        });
      }
      updates.stadiumSections = validated;
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
