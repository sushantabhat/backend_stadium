const esewaService = require('../services/esewaService');
const bookingService = require('../services/bookingService');
const createHttpError = require('http-errors');

// In-memory store for pending eSewa form data (keyed by transactionUuid)
const pendingForms = new Map();

async function initiateEsewaPayment(req, res, next) {
  try {
    const { matchId, seatIds, amount } = req.body;

    if (!matchId || !seatIds || !seatIds.length || !amount) {
      throw createHttpError('matchId, seatIds, and amount are required', 400);
    }

    const result = await esewaService.initiatePayment({
      amount,
      matchId,
      seatIds,
    });

    // Store formData so the HTML endpoint can retrieve it
    const uuid = result.formData.transaction_uuid;
    pendingForms.set(uuid, result.formData);
    // Clean up after 30 minutes
    setTimeout(() => pendingForms.delete(uuid), 30 * 60 * 1000);

    // Return the URL the WebView should navigate to
    const host = req.headers.host || `localhost:${process.env.PORT || 5009}`;
    const protocol = req.protocol || 'http';
    const formPageUrl = `${protocol}://${host}/api/payments/esewa/form/${uuid}`;

    res.status(200).json({ formPageUrl, paymentUrl: result.paymentUrl });
  } catch (error) {
    next(error);
  }
}

// GET /api/payments/esewa/form/:uuid - serves real HTML auto-submit page
function getEsewaForm(req, res) {
  const { uuid } = req.params;
  const formData = pendingForms.get(uuid);

  if (!formData) {
    return res.status(404).send('<h1>Form expired or not found</h1>');
  }

  const fields = Object.keys(formData)
    .map(k => `<input type="hidden" name="${k}" value="${formData[k]}" />`)
    .join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { background: #07080B; color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; margin: 0; }
    .loader { border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid #62BA46; border-radius: 50%; width: 48px; height: 48px; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    p { margin-top: 20px; font-size: 16px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="loader"></div>
  <p>Redirecting to eSewa...</p>
  <form id="esewaForm" action="https://rc-epay.esewa.com.np/api/epay/main/v2/form" method="POST">
    ${fields}
  </form>
  <script>window.onload = function() { document.getElementById('esewaForm').submit(); };<\/script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}

async function verifyEsewaPayment(req, res, next) {
  try {
    const { data } = req.body;

    if (!data) {
      throw createHttpError('eSewa verification data is required', 400);
    }

    const verification = esewaService.verifyPayment(data);

    if (!verification.verified) {
      throw createHttpError('eSewa Payment verification failed', 400);
    }

    const result = await bookingService.confirmBooking(
      req.user.id,
      verification.matchId,
      verification.seatIds
    );

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

module.exports = { initiateEsewaPayment, getEsewaForm, verifyEsewaPayment };

