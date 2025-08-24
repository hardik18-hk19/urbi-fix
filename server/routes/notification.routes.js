import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getUserNotifications,
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
  createTestNotification,
} from "../controllers/notification.controller.js";

const router = express.Router();

// All notification routes require authentication
router.use(authenticate(["admin", "provider", "consumer"]));

// Get user notifications with pagination and filters
router.get("/", getUserNotifications);

// Get unread notification count
router.get("/unread-count", getUnreadCount);

// Mark specific notifications as read
router.patch("/read", markNotificationsAsRead);

// Mark all notifications as read
router.patch("/read-all", markAllNotificationsAsRead);

// Delete a notification
router.delete("/:notificationId", deleteNotification);

// Create test notification (development only)
if (process.env.NODE_ENV === "development") {
  router.post("/test", createTestNotification);
}

export default router;
