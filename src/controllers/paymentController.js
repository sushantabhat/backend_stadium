const esewaService = require('../services/esewaService');
const bookingService = require('../services/bookingService');

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function initiateEsewaPayment(req, res, next) {
  try {
    const { matchId, seatIds, amount } = req.body;

    if (!matchId || !seatIds || !seatIds.length || !amount) {
      throw createHttpError('matchId, seatIds, and amount are required', 400);
    }

    const productId = `${matchId}-${seatIds.join('-')}`;
    const productName = 'Stadium Ticket';
    const result = esewaService.initiatePayment(amount, productName, productId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function verifyEsewaPayment(req, res, next) {
  try {
    const { encodedData, transactionUuid, matchId, seatIds } = req.body;

    if (!encodedData || !transactionUuid || !matchId || !seatIds) {
      throw createHttpError('encodedData, transactionUuid, matchId, and seatIds are required', 400);
    }

    const verification = await esewaService.verifyPayment(encodedData, transactionUuid);

    if (!verification.verified) {
      throw createHttpError(`Payment verification failed: ${verification.error}`, 400);
    }

    const result = await bookingService.confirmBooking(req.user.id, matchId, seatIds);

    res.status(200).json({
      message: 'Payment successful and booking confirmed',
      booking: result.booking,
      tickets: result.tickets,
      refId: verification.refId,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { initiateEsewaPayment, verifyEsewaPayment };
