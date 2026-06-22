const authService = require('../services/authService');

const VALID_TLDS = [
  'com', 'net', 'org', 'edu', 'gov', 'mil', 'int',
  'co', 'io', 'me', 'app', 'dev', 'tech', 'online', 'site', 'store', 'blog',
  'uk', 'us', 'ca', 'au', 'in', 'de', 'fr', 'jp', 'br', 'nl', 'it', 'es',
  'ru', 'cn', 'kr', 'se', 'no', 'fi', 'dk', 'pl', 'cz', 'at', 'ch',
  'ie', 'nz', 'za', 'mx', 'ar', 'cl', 'pt', 'gr', 'tr', 'il', 'sg',
  'hk', 'tw', 'th', 'ph', 'my', 'id', 'vn', 'pk', 'bd', 'lk',
  'info', 'biz', 'name', 'pro', 'mobi', 'travel', 'museum', 'aero',
  'coop', 'jobs', 'cat', 'tel', 'asia', 'xxx',
];

const COMMON_DOMAIN_TYPOS = {
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmaik.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.om': 'gmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'hotmal.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'iclod.com': 'icloud.com',
  'icoud.com': 'icloud.com',
};

function validateEmail(email) {
  if (!email || !email.trim()) {
    return 'Email is required';
  }

  const trimmed = email.trim().toLowerCase();

  // Must contain exactly one @
  const atIndex = trimmed.indexOf('@');
  if (atIndex === -1 || trimmed.indexOf('@', atIndex + 1) !== -1) {
    return 'Invalid email format';
  }

  // Basic format check
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
    return 'Invalid email format';
  }

  const parts = trimmed.split('@');
  const localPart = parts[0];
  const domain = parts[1];

  // Local part validation
  if (localPart.length === 0 || localPart.length > 64) {
    return 'Invalid email format';
  }
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return 'Invalid email format';
  }
  if (localPart.includes('..')) {
    return 'Invalid email format';
  }

  // Domain validation
  if (!domain || !domain.includes('.')) {
    return 'Invalid email domain';
  }

  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];

  // TLD must be at least 2 characters, only letters
  if (tld.length < 2 || !/^[a-z]+$/.test(tld)) {
    return 'Invalid email domain';
  }

  // TLD must be a known valid TLD
  if (!VALID_TLDS.includes(tld)) {
    return 'Invalid email domain';
  }

  // Domain name (before TLD) must not be empty
  const domainName = domainParts.slice(0, -1).join('.');
  if (!domainName || domainName.length === 0) {
    return 'Invalid email domain';
  }

  // Domain must not contain numbers (catches gmai2.co, etc.)
  if (/\d/.test(domainName)) {
    return 'Invalid email domain';
  }

  // Domain must not start or end with a hyphen
  if (domainName.startsWith('-') || domainName.endsWith('-')) {
    return 'Invalid email domain';
  }

  // Check for common typos
  if (COMMON_DOMAIN_TYPOS[domain]) {
    return `Did you mean ${COMMON_DOMAIN_TYPOS[domain]}?`;
  }

  return null;
}

function validateCredentials({ name, email, password, requireName, checkPasswordLength = true }) {
  if (requireName) {
    if (!name || !name.trim()) {
      const error = new Error('Name is required');
      error.statusCode = 400;
      throw error;
    }
    if (name.trim().length < 3) {
      const error = new Error('Name must be at least 3 characters');
      error.statusCode = 400;
      throw error;
    }
  }

  const emailError = validateEmail(email);
  if (emailError) {
    const error = new Error(emailError);
    error.statusCode = 400;
    throw error;
  }

  if (!password) {
    const error = new Error('Password is required');
    error.statusCode = 400;
    throw error;
  }
  if (checkPasswordLength && password.length < 8) {
    const error = new Error('Password must be at least 8 characters');
    error.statusCode = 400;
    throw error;
  }
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    validateCredentials({ name, email, password, requireName: true });

    const result = await authService.registerUser({ name, email, password });

    res.status(201).json({
      message: 'Registration successful',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    validateCredentials({ email, password, requireName: false, checkPasswordLength: false });

    const result = await authService.loginUser({ email, password });

    res.status(200).json({
      message: 'Login successful',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getUserProfile(req.user.id);

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getMe,
};
