const mongoose = require('mongoose');
const StaffShift = require('../models/StaffShift');
const AttendanceLog = require('../models/AttendanceLog');

async function getShifts(filter) {
  const q = {};
  if (filter.staff) q.staff = filter.staff;
  if (filter.match) q.match = filter.match;
  if (filter.date) {
    const d = new Date(filter.date);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setDate(end.getDate() + 1);
    q.date = { $gte: d, $lt: end };
  }
  return StaffShift.find(q)
    .populate('staff', 'name email role')
    .populate('match', 'title teamA teamB matchDate status venue')
    .sort({ date: -1, createdAt: -1 })
    .limit(100);
}

async function getShiftById(id) {
  const shift = await StaffShift.findById(id)
    .populate('staff', 'name email role')
    .populate('match', 'title teamA teamB matchDate status venue');
  if (!shift) {
    const err = new Error('Shift not found');
    err.statusCode = 404;
    throw err;
  }
  return shift;
}

async function createShift({ staff, match, gate, date }) {
  if (!staff || !match || !gate?.trim()) {
    const err = new Error('Staff, match, and gate are required');
    err.statusCode = 400;
    throw err;
  }
  return StaffShift.create({
    staff,
    match,
    gate: gate.trim(),
    date: date || new Date(),
  });
}

async function updateShift(id, updates) {
  const shift = await StaffShift.findById(id);
  if (!shift) {
    const err = new Error('Shift not found');
    err.statusCode = 404;
    throw err;
  }
  if (updates.gate !== undefined) shift.gate = updates.gate.trim();
  if (updates.staff !== undefined) shift.staff = updates.staff;
  if (updates.match !== undefined) shift.match = updates.match;
  if (updates.date !== undefined) shift.date = updates.date;
  return shift.save();
}

async function deleteShift(id) {
  const shift = await StaffShift.findByIdAndDelete(id);
  if (!shift) {
    const err = new Error('Shift not found');
    err.statusCode = 404;
    throw err;
  }
  return shift;
}

async function getMyActiveShift(staffId) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const shift = await StaffShift.findOne({
    staff: staffId,
    date: { $gte: start, $lt: end },
  })
    .populate('staff', 'name email role')
    .populate('match', 'title teamA teamB matchDate status venue')
    .sort({ createdAt: -1 })
    .limit(1);

  return shift;
}

async function getGateStats(matchId) {
  const oid = new mongoose.Types.ObjectId(matchId);
  const logs = await AttendanceLog.aggregate([
    { $match: { match: oid } },
    {
      $group: {
        _id: '$gate',
        scanned: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const shifts = await StaffShift.find({ match: matchId })
    .populate('staff', 'name')
    .lean();

  const gateStaffMap = {};
  for (const s of shifts) {
    if (!gateStaffMap[s.gate]) gateStaffMap[s.gate] = [];
    gateStaffMap[s.gate].push(s.staff?.name || 'Unknown');
  }

  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

  const recentScans = await AttendanceLog.aggregate([
    { $match: { match: oid, entryTime: { $gte: fiveMinAgo } } },
    { $group: { _id: '$gate', count: { $sum: 1 } } },
  ]);

  const recentMap = {};
  for (const r of recentScans) {
    recentMap[r._id] = r.count;
  }

  const allGates = [...new Set([...logs.map(l => l._id), ...shifts.map(s => s.gate)])].filter(Boolean);

  return allGates.map(gate => ({
    gate,
    scanned: logs.find(l => l._id === gate)?.scanned || 0,
    staff: gateStaffMap[gate] || [],
    online: (recentMap[gate] || 0) > 0,
  }));
}

module.exports = {
  getShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
  getMyActiveShift,
  getGateStats,
};
