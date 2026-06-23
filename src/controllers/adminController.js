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
    if (!['user', 'staff', 'supervisor', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Role must be user, staff, supervisor, or admin' });
    }
    const user = await adminService.createUser({ name, email, password, role });
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const { name, email, role, status } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (status) updates.status = status;

    const user = await adminService.updateUser(req.params.id, updates);
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    await adminService.deleteUser(req.params.id);
    res.status(200).json({ message: 'User deleted successfully' });
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

async function getAllTickets(req, res, next) {
  try {
    const tickets = await adminService.getAllTickets();
    res.status(200).json({ tickets });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getAnalytics,
  getFraudLogs,
  getAllTickets,
};
