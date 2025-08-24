"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useSocket } from "./SocketContext";
import { notificationAPI } from "../lib/api";
import { useToast } from "./ToastContext";

export interface NotificationAction {
  label: string;
  action: string;
  url?: string;
  style: "primary" | "secondary" | "success" | "warning" | "danger";
}

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  data?: {
    bookingId?: string;
    chatRoomId?: string;
    serviceId?: string;
    amount?: number;
    url?: string;
    metadata?: any;
  };
  isRead: boolean;
  readAt?: string;
  priority: "low" | "medium" | "high" | "urgent";
  actionRequired: boolean;
  actions?: NotificationAction[];
  senderId?: {
    _id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  handleNotificationAction: (
    notification: Notification,
    action: NotificationAction
  ) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { socket, isConnected } = useSocket();
  const { addToast } = useToast();

  // Fetch notifications from API
  const refreshNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await notificationAPI.getUserNotifications();
      setNotifications(response.data || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      addToast({
        type: "error",
        message: "Failed to load notifications",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  // Mark notifications as read
  const markAsRead = useCallback(
    async (notificationIds: string[]) => {
      try {
        await notificationAPI.markAsRead(notificationIds);

        // Update local state
        setNotifications((prev) =>
          prev.map((notif) =>
            notificationIds.includes(notif._id)
              ? { ...notif, isRead: true, readAt: new Date().toISOString() }
              : notif
          )
        );

        // Update unread count
        const newUnreadCount = notifications.filter(
          (n) => !notificationIds.includes(n._id) && !n.isRead
        ).length;
        setUnreadCount(newUnreadCount);
      } catch (error) {
        console.error("Error marking notifications as read:", error);
        addToast({
          type: "error",
          message: "Failed to mark notifications as read",
          duration: 3000,
        });
      }
    },
    [notifications, addToast]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationAPI.markAllAsRead();

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => ({
          ...notif,
          isRead: true,
          readAt: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);

      addToast({
        type: "success",
        message: "All notifications marked as read",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      addToast({
        type: "error",
        message: "Failed to mark all notifications as read",
        duration: 3000,
      });
    }
  }, [addToast]);

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        await notificationAPI.deleteNotification(notificationId);

        // Update local state
        const deletedNotification = notifications.find(
          (n) => n._id === notificationId
        );
        setNotifications((prev) =>
          prev.filter((notif) => notif._id !== notificationId)
        );

        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        addToast({
          type: "success",
          message: "Notification deleted",
          duration: 2000,
        });
      } catch (error) {
        console.error("Error deleting notification:", error);
        addToast({
          type: "error",
          message: "Failed to delete notification",
          duration: 3000,
        });
      }
    },
    [notifications, addToast]
  );

  // Handle notification actions
  const handleNotificationAction = useCallback(
    (notification: Notification, action: NotificationAction) => {
      // Mark notification as read when action is taken
      if (!notification.isRead) {
        markAsRead([notification._id]);
      }

      // Handle different action types
      switch (action.action) {
        case "view":
          if (action.url) {
            window.location.href = action.url;
          } else if (notification.data?.url) {
            window.location.href = notification.data.url;
          }
          break;
        case "accept":
        case "reject":
        case "counter":
          // These actions would typically require API calls
          if (action.url) {
            window.location.href = action.url;
          }
          break;
        case "pay":
          if (notification.data?.bookingId) {
            window.location.href = `/payments/${notification.data.bookingId}`;
          }
          break;
        default:
          if (action.url) {
            window.location.href = action.url;
          }
      }
    },
    [markAsRead]
  );

  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Handle new notification
    socket.on("new_notification", ({ notification }) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show toast notification for high priority notifications
      if (
        notification.priority === "high" ||
        notification.priority === "urgent"
      ) {
        addToast({
          type: notification.priority === "urgent" ? "error" : "info",
          message: notification.title,
          duration: notification.priority === "urgent" ? 8000 : 5000,
        });
      }
    });

    // Handle unread count updates
    socket.on("unread_count_update", ({ count }) => {
      setUnreadCount(count);
    });

    // Handle notifications marked as read
    socket.on("notifications_read", ({ notificationIds }) => {
      setNotifications((prev) =>
        prev.map((notif) =>
          notificationIds.includes(notif._id)
            ? { ...notif, isRead: true, readAt: new Date().toISOString() }
            : notif
        )
      );
    });

    // Handle all notifications marked as read
    socket.on("all_notifications_read", () => {
      setNotifications((prev) =>
        prev.map((notif) => ({
          ...notif,
          isRead: true,
          readAt: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    });

    // Handle notification deleted
    socket.on("notification_deleted", ({ notificationId }) => {
      setNotifications((prev) =>
        prev.filter((notif) => notif._id !== notificationId)
      );
    });

    // Cleanup listeners
    return () => {
      socket.off("new_notification");
      socket.off("unread_count_update");
      socket.off("notifications_read");
      socket.off("all_notifications_read");
      socket.off("notification_deleted");
    };
  }, [socket, isConnected, addToast]);

  // Load initial notifications
  useEffect(() => {
    if (isConnected) {
      refreshNotifications();
    }
  }, [isConnected, refreshNotifications]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    handleNotificationAction,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
