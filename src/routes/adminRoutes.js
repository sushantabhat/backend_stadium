const express = require('express');
const adminController = require('../controllers/adminController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const Venue = require('../models/Venue');

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'supervisor'));

router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/analytics', adminController.getAnalytics);
router.get('/tickets', adminController.getAllTickets);
router.get('/fraud-logs', adminController.getFraudLogs);
router.get('/fraud-logs/:id', adminController.getFraudLogById);
router.get('/fraud-logs/:id/attendance', adminController.getFraudLogAttendance);
router.put('/fraud-logs/:id/resolve', adminController.resolveFraudLog);
router.put('/fraud-logs/:id/escalate', adminController.escalateFraudLog);

router.get('/venues', async (req, res) => {
  try {
    const venues = await Venue.find().sort({ name: 1 }).lean();
    res.json({ venues });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/venues', async (req, res) => {
  try {
    const { name, location, pricing, stadiumSections, seatLayout, gates } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Venue name is required' });
    const venue = await Venue.create({
      name: name.trim(),
      location: location || '',
      pricing: pricing || {},
      stadiumSections: stadiumSections || [],
      gates: gates || [],
      seatLayout: seatLayout || null,
      createdBy: req.user.id,
    });
    res.status(201).json({ venue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/venues/:id', async (req, res) => {
  try {
    const { name, location, pricing, stadiumSections, seatLayout, gates } = req.body;
    const venue = await Venue.findByIdAndUpdate(
      req.params.id,
      { name, location, pricing, stadiumSections, seatLayout, gates },
      { returnDocument: 'after', runValidators: true }
    );
    if (!venue) return res.status(404).json({ message: 'Venue not found' });
    res.json({ venue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/venues/:id', async (req, res) => {
  try {
    const venue = await Venue.findByIdAndDelete(req.params.id);
    if (!venue) return res.status(404).json({ message: 'Venue not found' });
    res.json({ message: 'Venue deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
