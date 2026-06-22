const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const notificationService = require('../services/notificationService');

router.get('/', protect, async (req, res, next) => {
  try {
    const notifications = await notificationService.getMyNotifications(req.user.id);
    const unreadCount = await notificationService.getUnreadCount(req.user.id);
    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
});

router.get('/unread-count', protect, async (req, res, next) => {
  try {
    const unreadCount = await notificationService.getUnreadCount(req.user.id);
    res.json({ unreadCount });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', protect, async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (error) {
    next(error);
  }
});

router.patch('/read-all', protect, async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
