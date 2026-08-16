const mockCardService = require('../services/mockCardService');
const bookingService = require('../services/bookingService');

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function initiateCardPayment(req, res, next) {
  try {
    const { cardNumber, cardHolderName, expiryMonth, expiryYear, cvv, amount } = req.body;

    if (!amount || amount <= 0) {
      throw createHttpError('Valid amount is required', 400);
    }

    const result = mockCardService.processCardPayment(
      { cardNumber, cardHolderName, expiryMonth, expiryYear, cvv },
      amount
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function confirmCardBooking(req, res, next) {
  try {
    const { transactionId, matchId, seatIds } = req.body;

    if (!transactionId || !matchId || !seatIds) {
      throw createHttpError('transactionId, matchId, and seatIds are required', 400);
    }

    const result = await bookingService.confirmBooking(req.user.id, matchId, seatIds);

    res.status(200).json({
      message: 'Booking confirmed',
      booking: result.booking,
      tickets: result.tickets,
      transactionId,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { initiateCardPayment, confirmCardBooking };
