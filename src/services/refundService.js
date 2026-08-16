const Refund = require('../models/Refund');
const { createNotification } = require('./notificationService');

function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

async function processRefundForBooking(booking, reason = 'match_cancelled') {
  const estimatedSettlementDate = addBusinessDays(new Date(), 5);

  const refund = await Refund.create({
    booking: booking._id,
    user: booking.user,
    match: booking.match,
    amount: booking.totalAmount,
    transactionId: booking.transactionId || null,
    refundId: `RFND-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    gatewayRefundId: `GTWY-REF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    reason,
    status: 'processing',
    estimatedSettlementDate,
  });

  console.log(`[REFUND] ${refund.refundId} initiated — Rs.${booking.totalAmount} — ETA ${estimatedSettlementDate.toISOString().slice(0, 10)}`);

  // Notify user: refund processing
  try {
    const etaStr = estimatedSettlementDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    await createNotification(booking.user, {
      title: 'Refund Processing',
      message: `Your Rs.${booking.totalAmount} refund is being processed. Expected by ${etaStr}.`,
      type: 'refund_processing',
      data: { refundId: refund.refundId, amount: booking.totalAmount, matchId: booking.match, estimatedSettlementDate },
    });
  } catch (err) {
    console.error(`[REFUND] Notification failed for ${refund.refundId}:`, err.message);
  }

  // Simulate async gateway processing
  setTimeout(async () => {
    const settleDelay = Math.floor(Math.random() * 4000) + 2000;
    setTimeout(async () => {
      try {
        await Refund.findByIdAndUpdate(refund._id, {
          status: 'completed',
          settledAt: new Date(),
        });
        console.log(`[REFUND] ${refund.refundId} settled — gateway: ${refund.gatewayRefundId}`);

        // Notify user: refund completed
        try {
          await createNotification(booking.user, {
            title: 'Refund Completed',
            message: `Your Rs.${booking.totalAmount} refund has been successfully credited to your account.`,
            type: 'refund_completed',
            data: { refundId: refund.refundId, amount: booking.totalAmount, matchId: booking.match },
          });
        } catch (notifErr) {
          console.error(`[REFUND] Completion notification failed for ${refund.refundId}:`, notifErr.message);
        }
      } catch (err) {
        console.error(`[REFUND] ${refund.refundId} settlement failed:`, err.message);
      }
    }, settleDelay);
  }, 500);

  return refund;
}

module.exports = { processRefundForBooking };
