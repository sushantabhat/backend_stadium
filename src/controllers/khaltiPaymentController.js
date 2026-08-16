const khaltiService = require('../services/khaltiService');
const bookingService = require('../services/bookingService');

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function initiateKhaltiPayment(req, res, next) {
  try {
    const { matchId, seatIds, amount } = req.body;

    if (!matchId || !seatIds || !seatIds.length || !amount) {
      throw createHttpError('matchId, seatIds, and amount are required', 400);
    }

    const customerInfo = {
      name: req.user.name || 'Guest',
      email: req.user.email || 'guest@example.com',
      phone: req.user.phone || '9800000000',
    };

    const result = await khaltiService.initiatePayment({
      amount,
      matchId,
      seatIds,
      customerInfo,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function verifyKhaltiPayment(req, res, next) {
  try {
    const { pidx, matchId, seatIds } = req.body;

    if (!pidx || !matchId || !seatIds) {
      throw createHttpError('pidx, matchId, and seatIds are required', 400);
    }

    const verification = await khaltiService.lookupPayment(pidx);

    if (!verification.verified) {
      throw createHttpError(`Payment verification failed: ${verification.status}`, 400);
    }

    const result = await bookingService.confirmBooking(req.user.id, matchId, seatIds);

    res.status(200).json({
      message: 'Payment successful and booking confirmed',
      booking: result.booking,
      tickets: result.tickets,
      transactionId: verification.transactionId,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { initiateKhaltiPayment, verifyKhaltiPayment };
