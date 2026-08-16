const Incident = require('../models/Incident');
const Ticket = require('../models/Ticket');

// POST /api/incidents
exports.reportIncident = async (req, res) => {
  try {
    const { type, severity, ticketCode, notes } = req.body;

    // Look up the ticket by code to link it to the incident
    let ticketId = null;
    if (ticketCode) {
      const ticket = await Ticket.findOne({ ticketCode });
      if (ticket) {
        ticketId = ticket._id;
      }
    }

    const newIncident = new Incident({
      type,
      severity,
      ticket: ticketId,
      ticketCode,
      notes,
    });

    await newIncident.save();

    res.status(201).json({
      success: true,
      message: 'Incident reported successfully.',
      incident: newIncident
    });
  } catch (error) {
    console.error('[Incident Controller] Error reporting incident:', error);
    res.status(500).json({ success: false, message: 'Server error reporting incident.' });
  }
};

// GET /api/incidents
exports.getIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find()
      .populate('reportedBy', 'name email')
      .populate({
        path: 'ticket',
        populate: [
          { path: 'user', select: 'name email phone' },
          { path: 'seat', select: 'seatLabel category zone' },
          { path: 'match', select: 'title date venue' },
        ],
      })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, incidents });
  } catch (error) {
    console.error('[Incident Controller] Error fetching incidents:', error);
    res.status(500).json({ success: false, message: 'Server error fetching incidents.' });
  }
};

// GET /api/incidents/:id
exports.getIncidentById = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('reportedBy', 'name email')
      .populate({
        path: 'ticket',
        populate: [
          { path: 'user', select: 'name email phone' },
          { path: 'seat', select: 'seatLabel category zone' },
          { path: 'match', select: 'title date venue' },
        ],
      });
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }
    res.status(200).json({ success: true, incident });
  } catch (error) {
    console.error('[Incident Controller] Error fetching incident:', error);
    res.status(500).json({ success: false, message: 'Server error fetching incident.' });
  }
};

// PUT /api/incidents/:id/status
exports.updateIncidentStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    if (status) incident.status = status;
    if (notes) incident.notes = incident.notes ? `${incident.notes}\n\nUpdate: ${notes}` : notes;

    await incident.save();
    res.status(200).json({ success: true, incident });
  } catch (error) {
    console.error('[Incident Controller] Error updating incident:', error);
    res.status(500).json({ success: false, message: 'Server error updating incident.' });
  }
};
