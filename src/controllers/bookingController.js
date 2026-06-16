const bookingService = require('../services/bookingService');

async function lockSeats(req, res, next) {
  try {
    const { matchId, seatIds } = req.body;
    const userId = req.user.id;

    const lockedSeats = await bookingService.lockSeats(userId, matchId, seatIds);

    res.status(200).json({
      message: 'Seats successfully locked for 5 minutes',
      lockedUntil: lockedSeats[0]?.lockedUntil,
      seats: lockedSeats,
    });
  } catch (error) {
    next(error);
  }
}

async function unlockSeats(req, res, next) {
  try {
    const { matchId, seatIds } = req.body;
    const userId = req.user.id;

    const unlockedSeats = await bookingService.unlockSeats(userId, matchId, seatIds);

    res.status(200).json({
      message: 'Seats successfully unlocked',
      seats: unlockedSeats,
    });
  } catch (error) {
    next(error);
  }
}

async function confirmBooking(req, res, next) {
  try {
    const { matchId, seatIds, totalAmount } = req.body;
    const userId = req.user.id;

    const result = await bookingService.confirmBooking(userId, matchId, seatIds, totalAmount);

    res.status(201).json({
      message: 'Booking confirmed successfully',
      booking: result.booking,
      tickets: result.tickets,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyBookings(req, res, next) {
  try {
    const bookings = await bookingService.getMyBookings(req.user.id);
    res.status(200).json({ bookings });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  lockSeats,
  unlockSeats,
  confirmBooking,
  getMyBookings,
};
