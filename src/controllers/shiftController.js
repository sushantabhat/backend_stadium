const shiftService = require('../services/shiftService');

async function getShifts(req, res, next) {
  try {
    const { staff, match, date } = req.query;
    const shifts = await shiftService.getShifts({ staff, match, date });
    res.json({ shifts });
  } catch (error) {
    next(error);
  }
}

async function getShiftById(req, res, next) {
  try {
    const shift = await shiftService.getShiftById(req.params.id);
    res.json({ shift });
  } catch (error) {
    next(error);
  }
}

async function createShift(req, res, next) {
  try {
    const { staff, match, gate, date } = req.body;
    const shift = await shiftService.createShift({ staff, match, gate, date });
    res.status(201).json({ message: 'Shift created', shift });
  } catch (error) {
    next(error);
  }
}

async function updateShift(req, res, next) {
  try {
    const shift = await shiftService.updateShift(req.params.id, req.body);
    res.json({ message: 'Shift updated', shift });
  } catch (error) {
    next(error);
  }
}

async function deleteShift(req, res, next) {
  try {
    await shiftService.deleteShift(req.params.id);
    res.json({ message: 'Shift deleted' });
  } catch (error) {
    next(error);
  }
}

async function getMyActiveShift(req, res, next) {
  try {
    const shift = await shiftService.getMyActiveShift(req.user.id);
    res.json({ shift });
  } catch (error) {
    next(error);
  }
}

async function getMyShifts(req, res, next) {
  try {
    const shifts = await shiftService.getShifts({ staff: req.user.id });
    res.json({ shifts });
  } catch (error) {
    next(error);
  }
}

async function getGateStats(req, res, next) {
  try {
    const { matchId } = req.params;
    if (!matchId) return res.status(400).json({ message: 'Match ID is required' });
    const stats = await shiftService.getGateStats(matchId);
    res.json({ gates: stats });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
  getMyActiveShift,
  getMyShifts,
  getGateStats,
};
