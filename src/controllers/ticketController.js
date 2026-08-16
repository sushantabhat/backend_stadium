const ticketService = require('../services/ticketService');

async function getMyTickets(req, res, next) {
  try {
    const tickets = await ticketService.getMyTickets(req.user.id);
    res.status(200).json({ tickets });
  } catch (error) {
    next(error);
  }
}

async function verifyTicket(req, res, next) {
  try {
    const { ticketCode } = req.body;
    const staffId = req.user.id;

    const result = await ticketService.verifyTicket(staffId, ticketCode);

    res.status(200).json({
      message: 'Ticket verified. Welcome to the stadium!',
      ticket: result.ticket,
    });
  } catch (error) {
    next(error);
  }
}

async function denyTicket(req, res, next) {
  try {
    const { ticketCode } = req.body;
    const staffId = req.user.id;

    const result = await ticketService.denyTicket(staffId, ticketCode);

    res.status(200).json({
      message: result.message,
      ticket: result.ticket,
    });
  } catch (error) {
    next(error);
  }
}

async function lookupTicket(req, res, next) {
  try {
    const { ticketCode } = req.params;
    
    const result = await ticketService.lookupTicket(ticketCode);

    res.status(200).json({
      message: 'Ticket details retrieved successfully.',
      ticket: result.ticket,
    });
  } catch (error) {
    next(error);
  }
}

async function getStaffScanHistory(req, res, next) {
  try {
    const history = await ticketService.getStaffScanHistory(req.user.id);
    res.status(200).json({ history });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyTickets,
  verifyTicket,
  denyTicket,
  lookupTicket,
  getStaffScanHistory,
};
