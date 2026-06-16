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
      message: 'Ticket verified successfully. Welcome to the stadium!',
      ticket: {
        id: result.ticket._id,
        ticketCode: result.ticket.ticketCode,
        userName: result.ticket.user.name,
        matchTitle: result.ticket.match.title,
        seatLabel: result.ticket.seat.seatLabel,
        category: result.ticket.seat.category,
        scannedAt: result.ticket.scannedAt,
      },
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
  getStaffScanHistory,
};
