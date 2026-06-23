const Notification = require('../models/Notification');
const { emitNewNotification } = require('./socketService');

async function createNotification(userId, { title, message, type = 'general', data = null }) {
  const notification = await Notification.create({ user: userId, title, message, type, data });

  try {
    const notifObj = notification.toObject();
    emitNewNotification(userId.toString(), notifObj);
  } catch (err) {
    console.error(`[SOCKET] Failed to emit notification for user ${userId}:`, err.message);
  }

  return notification;
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
