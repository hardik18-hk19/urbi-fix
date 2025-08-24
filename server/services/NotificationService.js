import Notification from "../models/Notification.js";
import { emitToUser, isUserOnline } from "../config/socket.js";

class NotificationService {
  constructor(io) {
    this.io = io;
  }

  // Send real-time notification
  async sendNotification(notificationData) {
    try {
      // Create notification in database
      const notification = await Notification.createNotification(
        notificationData
      );

      // Populate sender details if exists
      if (notification.senderId) {
        await notification.populate("senderId", "name email role avatar");
      }

      // Send real-time notification if user is online
      if (isUserOnline(notificationData.recipientId)) {
        emitToUser(this.io, notificationData.recipientId, "new_notification", {
          notification,
          timestamp: new Date(),
        });

        // Also emit unread count update
        const unreadCount = await this.getUnreadCount(
          notificationData.recipientId
        );
        emitToUser(
          this.io,
          notificationData.recipientId,
          "unread_count_update",
          {
            count: unreadCount,
            timestamp: new Date(),
          }
        );
      }

      return notification;
    } catch (error) {
      console.error("Error sending notification:", error);
      throw error;
    }
  }

  // Send notification to multiple users
  async sendBulkNotifications(recipients, notificationTemplate) {
    const notifications = [];

    for (const recipientId of recipients) {
      try {
        const notification = await this.sendNotification({
          ...notificationTemplate,
          recipientId,
        });
        notifications.push(notification);
      } catch (error) {
        console.error(
          `Failed to send notification to user ${recipientId}:`,
          error
        );
      }
    }

    return notifications;
  }

  // Get unread notification count
  async getUnreadCount(userId) {
    return await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });
  }

  // Mark notifications as read
  async markAsRead(userId, notificationIds) {
    const result = await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        recipientId: userId,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    // Emit real-time update
    if (isUserOnline(userId)) {
      const unreadCount = await this.getUnreadCount(userId);
      emitToUser(this.io, userId, "unread_count_update", {
        count: unreadCount,
        timestamp: new Date(),
      });

      emitToUser(this.io, userId, "notifications_read", {
        notificationIds,
        timestamp: new Date(),
      });
    }

    return result;
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      {
        recipientId: userId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    // Emit real-time update
    if (isUserOnline(userId)) {
      emitToUser(this.io, userId, "unread_count_update", {
        count: 0,
        timestamp: new Date(),
      });

      emitToUser(this.io, userId, "all_notifications_read", {
        timestamp: new Date(),
      });
    }

    return result;
  }

  // Delete notification
  async deleteNotification(userId, notificationId) {
    const result = await Notification.deleteOne({
      _id: notificationId,
      recipientId: userId,
    });

    // Emit real-time update
    if (isUserOnline(userId)) {
      const unreadCount = await this.getUnreadCount(userId);
      emitToUser(this.io, userId, "unread_count_update", {
        count: unreadCount,
        timestamp: new Date(),
      });

      emitToUser(this.io, userId, "notification_deleted", {
        notificationId,
        timestamp: new Date(),
      });
    }

    return result;
  }

  // Get user notifications with pagination
  async getUserNotifications(userId, page = 1, limit = 20, filter = {}) {
    const skip = (page - 1) * limit;

    const query = {
      recipientId: userId,
      ...filter,
    };

    const notifications = await Notification.find(query)
      .populate("senderId", "name email role avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await this.getUnreadCount(userId);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  // Clean up old notifications
  async cleanupNotifications(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true,
    });

    console.log(`Cleaned up ${result.deletedCount} old notifications`);
    return result;
  }

  // Helper methods for specific notification types
  async notifyNewMessage(chatRoomId, senderId, recipientId, messageContent) {
    return await this.sendNotification({
      type: "message",
      recipientId,
      senderId,
      title: "New Message",
      message:
        messageContent.length > 50
          ? messageContent.substring(0, 50) + "..."
          : messageContent,
      data: {
        chatRoomId,
        url: `/chat/${chatRoomId}`,
      },
    });
  }

  async notifyBookingCreated(bookingId, providerId, consumerName, serviceName) {
    return await this.sendNotification({
      type: "booking_created",
      recipientId: providerId,
      title: "New Booking Request",
      message: `${consumerName} has requested to book "${serviceName}"`,
      data: {
        bookingId,
        url: `/provider-dashboard/bookings/${bookingId}`,
      },
    });
  }

  async notifyBookingStatusChange(bookingId, recipientId, status, serviceName) {
    const statusMessages = {
      confirmed: "Your booking has been confirmed",
      cancelled: "Your booking has been cancelled",
      completed: "Your booking has been completed",
      in_progress: "Your booking is now in progress",
    };

    return await this.sendNotification({
      type: "booking_updated",
      recipientId,
      title: "Booking Status Update",
      message: `${statusMessages[status]} for "${serviceName}"`,
      data: {
        bookingId,
        url: `/bookings/${bookingId}`,
      },
    });
  }

  async notifyPriceOffer(
    chatRoomId,
    recipientId,
    senderId,
    amount,
    serviceName
  ) {
    return await this.sendNotification({
      type: "price_offer",
      recipientId,
      senderId,
      title: "New Price Offer",
      message: `You received a price offer of $${amount} for "${serviceName}"`,
      data: {
        chatRoomId,
        amount,
        url: `/chat/${chatRoomId}`,
      },
    });
  }

  async notifyPriceOfferResponse(
    chatRoomId,
    recipientId,
    senderId,
    action,
    amount
  ) {
    const actionText = action === "accept" ? "accepted" : "rejected";
    return await this.sendNotification({
      type: `price_${action}ed`,
      recipientId,
      senderId,
      title: `Price Offer ${
        actionText.charAt(0).toUpperCase() + actionText.slice(1)
      }`,
      message: `Your price offer of $${amount} was ${actionText}`,
      data: {
        chatRoomId,
        amount,
        url: `/chat/${chatRoomId}`,
      },
    });
  }

  async notifyPaymentDue(bookingId, recipientId, amount, dueDate) {
    return await this.sendNotification({
      type: "payment_due",
      recipientId,
      title: "Payment Due",
      message: `Payment of $${amount} is due ${dueDate}`,
      data: {
        bookingId,
        amount,
        url: `/payments/${bookingId}`,
      },
      priority: "urgent",
    });
  }

  async notifySystemUpdate(recipientIds, title, message, url = null) {
    return await this.sendBulkNotifications(recipientIds, {
      type: "system",
      title,
      message,
      data: { url },
      priority: "low",
    });
  }
}

export default NotificationService;
