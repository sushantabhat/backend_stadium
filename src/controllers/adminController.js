const adminService = require('../services/adminService');

async function getUsers(req, res, next) {
  try {
    const { role } = req.query;
    const users = await adminService.getUsers(role);
    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (!['user', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Role must be user, staff, or admin' });
    }
    const user = await adminService.createUser({ name, email, password, role });
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    next(error);
  }
}

async function getAnalytics(req, res, next) {
  try {
    const analytics = await adminService.getAdminAnalytics();
    res.status(200).json({ analytics });
  } catch (error) {
    next(error);
  }
}

async function getFraudLogs(req, res, next) {
  try {
    const fraudLogs = await adminService.getFraudLogs();
    res.status(200).json({ fraudLogs });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUsers,
  createUser,
  getAnalytics,
  getFraudLogs,
};
