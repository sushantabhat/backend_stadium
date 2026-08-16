const CARD_BRANDS = [
  { name: 'Visa', pattern: /^4/, lengths: [16, 18, 19], cvvLength: 3 },
  { name: 'Mastercard', pattern: /^5[1-5]/, lengths: [16], cvvLength: 3 },
  { name: 'Amex', pattern: /^3[47]/, lengths: [15], cvvLength: 4 },
  { name: 'Discover', pattern: /^6(?:011|5)/, lengths: [16, 17, 18, 19], cvvLength: 3 },
];

function detectBrand(cardNumber) {
  for (const brand of CARD_BRANDS) {
    if (brand.pattern.test(cardNumber)) return brand;
  }
  return null;
}

function luhnCheck(cardNumber) {
  let sum = 0;
  let alt = false;
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i], 10);
    if (alt) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function validateCard(cardDetails) {
  const { cardNumber, cardHolderName, expiryMonth, expiryYear, cvv } = cardDetails;

  const errors = [];

  if (!cardHolderName || !cardHolderName.trim()) {
    errors.push('Card holder name is required');
  }

  const cleaned = (cardNumber || '').replace(/\s/g, '');
  if (!cleaned) {
    errors.push('Card number is required');
  } else if (!/^\d+$/.test(cleaned)) {
    errors.push('Card number must contain only digits');
  } else {
    const brand = detectBrand(cleaned);
    if (!brand) {
      errors.push('Card number is not from a supported issuer');
    } else if (!brand.lengths.includes(cleaned.length)) {
      errors.push(`Card number must be ${brand.lengths.join(' or ')} digits for ${brand.name}`);
    } else if (!luhnCheck(cleaned)) {
      errors.push('Card number failed checksum validation');
    }
  }

  const month = parseInt(expiryMonth, 10);
  const year = parseInt(expiryYear, 10);
  if (!expiryMonth || !expiryYear) {
    errors.push('Expiry date is required');
  } else if (month < 1 || month > 12) {
    errors.push('Expiry month must be between 01 and 12');
  } else {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const expiry = new Date(year, month, 0);
    if (expiry < new Date(currentYear, currentMonth - 1, 1)) {
      errors.push('Card has expired');
    }
  }

  if (!cvv) {
    errors.push('CVV is required');
  } else if (!/^\d+$/.test(cvv)) {
    errors.push('CVV must contain only digits');
  } else {
    const brand = detectBrand(cleaned);
    const expectedLength = brand ? brand.cvvLength : 3;
    if (cvv.length !== expectedLength) {
      errors.push(`CVV must be ${expectedLength} digits for this card type`);
    }
  }

  return errors;
}

function processCardPayment(cardDetails, amount) {
  const errors = validateCard(cardDetails);
  if (errors.length > 0) {
    const error = new Error(errors.join('. '));
    error.statusCode = 400;
    throw error;
  }

  return {
    success: true,
    transactionId: `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message: 'Payment processed successfully',
  };
}

module.exports = { processCardPayment };
