const KHALTI_CONFIG = {
  secretKey: process.env.KHALTI_SECRET_KEY || '',
  initiateUrl: process.env.KHALTI_INITIATE_URL || 'https://dev.khalti.com/api/v2/epayment/initiate/',
  lookupUrl: process.env.KHALTI_LOOKUP_URL || 'https://dev.khalti.com/api/v2/epayment/lookup/',
};

function generateOrderId(matchId, seatIds) {
  return `MATCH-${matchId}-SEATS-${seatIds.join('-')}`;
}

async function initiatePayment({ amount, matchId, seatIds, customerInfo }) {
  const purchaseOrderId = generateOrderId(matchId, seatIds);

  const body = {
    return_url: 'https://www.example.com/khalti/success',
    website_url: 'https://www.example.com',
    amount: String(Math.round(amount * 100)),
    purchase_order_id: purchaseOrderId,
    purchase_order_name: 'Stadium Ticket',
    customer_info: {
      name: customerInfo.name || 'Guest',
      email: customerInfo.email || 'guest@example.com',
      phone: customerInfo.phone || '9800000000',
    },
    product_details: seatIds.map((seatId, idx) => ({
      identity: seatId,
      name: `Seat ${idx + 1}`,
      total_price: Math.round(amount * 100),
      quantity: 1,
      unit_price: Math.round(amount * 100),
    })),
  };

  const response = await fetch(KHALTI_CONFIG.initiateUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key ${KHALTI_CONFIG.secretKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Khalti initiation failed: ${errorData}`);
  }

  const data = await response.json();
  return {
    pidx: data.pidx,
    paymentUrl: data.payment_url,
    expiresAt: data.expires_at,
    purchaseOrderId,
  };
}

async function lookupPayment(pidx) {
  const response = await fetch(KHALTI_CONFIG.lookupUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key ${KHALTI_CONFIG.secretKey}`,
    },
    body: JSON.stringify({ pidx }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Khalti lookup failed: ${errorData}`);
  }

  const data = await response.json();
  return {
    verified: data.status === 'Completed',
    status: data.status,
    totalAmount: data.total_amount,
    transactionId: data.transaction_id,
    fee: data.fee,
    refunded: data.refunded,
  };
}

module.exports = { initiatePayment, lookupPayment };
