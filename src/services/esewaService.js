const crypto = require('crypto');

const ESEWA_CONFIG = {
  merchantCode: process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST',
  secretKey: process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q',
  paymentUrl: process.env.ESEWA_PAYMENT_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
  statusUrl: process.env.ESEWA_STATUS_URL || 'https://rc-epay.esewa.com.np/api/epay/transaction/status',
};

function generateSignature(totalAmount, transactionUuid, productCode) {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return crypto
    .createHmac('sha256', ESEWA_CONFIG.secretKey)
    .update(message)
    .digest('base64');
}

function generateTransactionUuid() {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
  const random = crypto.randomBytes(6).toString('hex');
  return `${dateStr}-${random}`;
}

function initiatePayment(amount, productName, productId) {
  const totalAmount = Math.round(amount);
  const transactionUuid = generateTransactionUuid();
  const signature = generateSignature(totalAmount, transactionUuid, ESEWA_CONFIG.merchantCode);

  return {
    formData: {
      amount: String(totalAmount),
      total_amount: String(totalAmount),
      product_code: ESEWA_CONFIG.merchantCode,
      transaction_uuid: transactionUuid,
      product_name: productName,
      product_id: productId,
      product_service_charge: '0',
      product_delivery_charge: '0',
      tax_amount: '0',
      success_url: 'https://www.example.com/esewa/success',
      failure_url: 'https://www.example.com/esewa/failure',
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature,
    },
    paymentUrl: ESEWA_CONFIG.paymentUrl,
    transactionUuid,
  };
}

async function verifyPayment(encodedData, transactionUuid) {
  try {
    const decoded = JSON.parse(Buffer.from(encodedData, 'base64').toString('utf-8'));

    const receivedSignature = decoded.signature;
    const expectedSignature = generateSignature(
      decoded.total_amount,
      decoded.transaction_uuid,
      decoded.product_code
    );

    if (receivedSignature !== expectedSignature) {
      return { verified: false, error: 'Signature mismatch' };
    }

    const params = new URLSearchParams({
      product_code: ESEWA_CONFIG.merchantCode,
      total_amount: decoded.total_amount,
      transaction_uuid: decoded.transaction_uuid,
    });

    const response = await fetch(`${ESEWA_CONFIG.statusUrl}?${params}`);
    const statusData = await response.json();

    return {
      verified: statusData.status === 'COMPLETE',
      transaction: decoded,
      status: statusData,
      refId: decoded.ref_id || statusData.reference_id,
    };
  } catch (err) {
    return { verified: false, error: err.message };
  }
}

module.exports = { initiatePayment, verifyPayment };
