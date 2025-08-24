import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: [
        "message", // New chat message
        "booking_created", // New booking
        "booking_updated", // Booking status changed
        "booking_confirmed", // Booking confirmed
        "booking_cancelled", // Booking cancelled
        "price_offer", // Price negotiation offer
        "price_accepted", // Price offer accepted
        "price_rejected", // Price offer rejected
        "schedule_change", // Schedule modification request
        "payment_due", // Payment reminder
        "payment_received", // Payment confirmation
        "service_review", // New review on service
        "provider_verified", // Provider verification status
        "issue_resolved", // Issue marked as resolved
        "issue_escalated", // Issue escalated to admin
        "system", // System notifications
        "admin_message", // Admin announcement
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      // Additional data specific to notification type
      bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
      },
      chatRoomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatRoom",
      },
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
      serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
      },
      issueId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Issue",
      },
      amount: Number,
      url: String, // Deep link URL
      metadata: mongoose.Schema.Types.Mixed, // Additional flexible data
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    expiresAt: {
      type: Date,
    },
    actionRequired: {
      type: Boolean,
      default: false,
    },
    actions: [
      {
        label: String,
        action: String, // Action type like 'accept', 'reject', 'view', 'pay'
        url: String,
        style: {
          type: String,
          enum: ["primary", "secondary", "success", "warning", "danger"],
          default: "primary",
        },
      },
    ],
  },
  { timestamps: true }
);

// Indexes for efficient queries
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 });

// Auto-remove expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Mark notification as read
notificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Create notification with default settings based on type
notificationSchema.statics.createNotification = async function (data) {
  const defaults = getNotificationDefaults(data.type);
  const notificationData = {
    ...defaults,
    ...data,
    title: data.title || defaults.title,
    message: data.message || defaults.message,
  };

  const notification = new this(notificationData);
  return await notification.save();
};

// Get default settings for notification types
function getNotificationDefaults(type) {
  const defaults = {
    message: {
      priority: "medium",
      actionRequired: false,
      title: "New Message",
      message: "You have a new message",
    },
    booking_created: {
      priority: "high",
      actionRequired: true,
      title: "New Booking Request",
      message: "You have received a new booking request",
      actions: [
        { label: "View Details", action: "view", style: "primary" },
        { label: "Accept", action: "accept", style: "success" },
        { label: "Decline", action: "decline", style: "danger" },
      ],
    },
    booking_confirmed: {
      priority: "high",
      actionRequired: false,
      title: "Booking Confirmed",
      message: "Your booking has been confirmed",
    },
    price_offer: {
      priority: "high",
      actionRequired: true,
      title: "Price Offer Received",
      message: "You have received a new price offer",
      actions: [
        { label: "View Offer", action: "view", style: "primary" },
        { label: "Accept", action: "accept", style: "success" },
        { label: "Counter Offer", action: "counter", style: "secondary" },
        { label: "Reject", action: "reject", style: "danger" },
      ],
    },
    payment_due: {
      priority: "urgent",
      actionRequired: true,
      title: "Payment Due",
      message: "You have a pending payment",
      actions: [{ label: "Pay Now", action: "pay", style: "success" }],
    },
    system: {
      priority: "low",
      actionRequired: false,
      title: "System Notification",
      message: "System update notification",
    },
  };

  return defaults[type] || defaults.system;
}

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
