const Incident = require('../models/Incident');

// POST /api/incidents
exports.reportIncident = async (req, res) => {
  try {
    const { type, severity, ticketCode, notes } = req.body;
    
    // In a real app with auth middleware, you'd extract req.user.id
    // const reportedBy = req.user ? req.user.id : null;
    
    const newIncident = new Incident({
      type,
      severity,
      ticketCode,
      notes,
      // reportedBy
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
    const incidents = await Incident.find().populate('reportedBy', 'name email').populate('resolvedBy', 'name email').sort({ createdAt: -1 });
    res.status(200).json({ success: true, incidents });
  } catch (error) {
    console.error('[Incident Controller] Error fetching incidents:', error);
    res.status(500).json({ success: false, message: 'Server error fetching incidents.' });
  }
};

// GET /api/incidents/:id
exports.getIncidentById = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id).populate('reportedBy', 'name email').populate('resolvedBy', 'name email');
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
