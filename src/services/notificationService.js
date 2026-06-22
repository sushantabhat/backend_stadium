const Notification = require('../models/Notification');

async function createNotification(userId, { title, message, type = 'general', data = null }) {
  return Notification.create({ user: userId, title, message, type, data });
}

async function getMyNotifications(userId) {
  return Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(50);
}

async function getUnreadCount(userId) {
  return Notification.countDocuments({ user: userId, read: false });
}

async function markAsRead(notificationId, userId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true }
  );
}

async function markAllAsRead(userId) {
  return Notification.updateMany({ user: userId, read: false }, { read: true });
}

module.exports = {
  createNotification,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
