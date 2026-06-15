const authService = require('../services/authService');

function validateCredentials({ name, email, password, requireName }) {
  if (requireName && (!name || !name.trim())) {
    const error = new Error('Name is required');
    error.statusCode = 400;
    throw error;
  }

  if (!email || !email.trim()) {
    const error = new Error('Email is required');
    error.statusCode = 400;
    throw error;
  }

  if (!password || password.length < 6) {
    const error = new Error('Password must be at least 6 characters');
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
    validateCredentials({ email, password, requireName: false });

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
