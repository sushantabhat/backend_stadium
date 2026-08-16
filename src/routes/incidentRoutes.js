const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
// const { verifyToken } = require('../middlewares/authMiddleware'); // Import if auth is needed

// Create a new incident report
router.post('/', incidentController.reportIncident);

// Get all incidents (for admin/supervisor)
router.get('/', incidentController.getIncidents);

// Get incident by ID
router.get('/:id', incidentController.getIncidentById);

// Update incident status (e.g. resolve/escalate)
router.put('/:id/status', incidentController.updateIncidentStatus);

module.exports = router;
