import Notification from "../models/Notification.js";
import NotificationService from "../services/NotificationService.js";

// Get user notifications
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 20,
      type,
      isRead,
      priority,
      startDate,
      endDate,
    } = req.query;

    // Build filter object
    const filter = {};
    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === "true";
    if (priority) filter.priority = priority;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const io = req.app.get("io");
    const notificationService = new NotificationService(io);

    const result = await notificationService.getUserNotifications(
      userId,
      parseInt(page),
      parseInt(limit),
      filter
    );

    res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};

// Get unread notification count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const io = req.app.get("io");
    const notificationService = new NotificationService(io);

    const unreadCount = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread count",
      error: error.message,
    });
  }
};

// Mark specific notifications as read
export const markNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "notificationIds array is required",
      });
    }

    const io = req.app.get("io");
    const notificationService = new NotificationService(io);

    const result = await notificationService.markAsRead(
      userId,
      notificationIds
    );

    res.status(200).json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        message: `${result.modifiedCount} notifications marked as read`,
      },
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read",
      error: error.message,
    });
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const io = req.app.get("io");
    const notificationService = new NotificationService(io);

    const result = await notificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        message: `${result.modifiedCount} notifications marked as read`,
      },
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
      error: error.message,
    });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const io = req.app.get("io");
    const notificationService = new NotificationService(io);

    const result = await notificationService.deleteNotification(
      userId,
      notificationId
    );

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { message: "Notification deleted successfully" },
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message,
    });
  }
};

// Create test notification (development only)
export const createTestNotification = async (req, res) => {
  try {
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({
        success: false,
        message: "Test notifications only available in development",
      });
    }

    const userId = req.user.id;
    const {
      type = "system",
      title = "Test Notification",
      message = "This is a test notification",
      priority = "medium",
    } = req.body;

    const io = req.app.get("io");
    const notificationService = new NotificationService(io);

    const notification = await notificationService.sendNotification({
      type,
      recipientId: userId,
      title,
      message,
      priority,
      data: {
        url: "/test",
        metadata: { isTest: true },
      },
    });

    res.status(201).json({
      success: true,
      data: notification,
      message: "Test notification created successfully",
    });
  } catch (error) {
    console.error("Error creating test notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create test notification",
      error: error.message,
    });
  }
};
