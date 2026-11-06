const Notification = require("../models/Notification");

/**
 * GET /api/notifications
 */
exports.list = async (req, res) => {
  try {
    const { unreadOnly, limit = 50, page = 1 } = req.query;
    const filter = { userId: req.user._id, isDismissed: { $ne: true } };

    if (unreadOnly === "true") {
      filter.isRead = false;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [items, totalCount, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: req.user._id, isRead: false, isDismissed: { $ne: true } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        items,
        totalCount,
        unreadCount,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/notifications/:id/read
 */
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/notifications/mark-all-read
 */
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/notifications/:id
 */
exports.deleteNotification = async (req, res) => {
  try {
    const deleted = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, isDismissed: { $ne: true } },
      { $set: { isDismissed: true, isRead: true, readAt: new Date() } },
      { new: true },
    );

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

