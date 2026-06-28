const prisma = require('../utils/prisma');

// Fetch notifications (unread first)
const getNotifications = async (req, res, next) => {
  try {
    const { unreadOnly = 'false' } = req.query;
    const where = {};

    if (unreadOnly === 'true') {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    next(error);
  }
};

// Mark a single notification as read
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    next(error);
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { read: false },
      data: { read: true }
    });

    res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
