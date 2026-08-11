const crypto = require('crypto');

const ESEWA_CONFIG = {
  secretKey: process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q',
  merchantCode: process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST',
  paymentUrl: process.env.ESEWA_PAYMENT_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
};

function generateSignature(message) {
  const hmac = crypto.createHmac('sha256', ESEWA_CONFIG.secretKey);
  hmac.update(message);
  return hmac.digest('base64');
}

function generateOrderId(matchId, seatIds) {
  return `MATCH-${matchId}-SEATS-${seatIds.join('-')}-${Date.now()}`;
}

async function initiatePayment({ amount, matchId, seatIds }) {
  const transactionUuid = generateOrderId(matchId, seatIds);
  const totalAmount = amount.toString();
  
  const signedFieldNames = 'total_amount,transaction_uuid,product_code';
  const signatureString = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${ESEWA_CONFIG.merchantCode}`;
  const signature = generateSignature(signatureString);

  return {
    paymentUrl: ESEWA_CONFIG.paymentUrl,
    formData: {
      amount: totalAmount,
      tax_amount: '0',
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: ESEWA_CONFIG.merchantCode,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: 'https://www.example.com/esewa/success',
      failure_url: 'https://www.example.com/esewa/failure',
      signed_field_names: signedFieldNames,
      signature: signature,
    },
  };
}

function verifyPayment(base64Data) {
  try {
    const decodedString = Buffer.from(base64Data, 'base64').toString('utf-8');
    const data = JSON.parse(decodedString);

    if (data.status !== 'COMPLETE') {
      throw new Error(`eSewa payment failed: ${data.status}`);
    }

    // eSewa v2 signature validation on callback:
    // we must verify using the exact format: field1=val1,field2=val2
    const signedFieldNames = data.signed_field_names.split(',');
    const signatureString = signedFieldNames.map(field => `${field}=${data[field] || ''}`).join(',');
    const expectedSignature = generateSignature(signatureString);

    if (expectedSignature !== data.signature) {
      throw new Error('Signature verification failed');
    }

    const parts = data.transaction_uuid.split('-');
    if (parts[0] !== 'MATCH' || parts[2] !== 'SEATS') {
      throw new Error('Invalid transaction UUID format');
    }

    const matchId = parts[1];
    const seatIds = parts.slice(3, -1);

    return {
      verified: true,
      transactionId: data.transaction_code,
      matchId,
      seatIds,
      totalAmount: data.total_amount,
    };
  } catch (err) {
    throw new Error(`eSewa verification error: ${err.message}`);
  }
}

module.exports = { initiatePayment, verifyPayment };
