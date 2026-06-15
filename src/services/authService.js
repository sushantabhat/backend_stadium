const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_EXPIRES_IN = '7d';

function createToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

async function registerUser({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error('Email is already registered');
    error.statusCode = 409;
    throw error;
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: 'user',
  });

  const token = createToken(user._id);

  return {
    token,
    user: user.toPublicJSON(),
  };
}

async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = createToken(user._id);

  return {
    token,
    user: user.toPublicJSON(),
  };
}

async function getUserProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return user.toPublicJSON();
}

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
};
