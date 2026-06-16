const adminService = require('../services/adminService');

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
  getAnalytics,
  getFraudLogs,
};
