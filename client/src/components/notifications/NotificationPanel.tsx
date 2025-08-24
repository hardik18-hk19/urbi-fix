"use client";

import React, { useState } from "react";
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  RefreshCw,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  useNotifications,
  Notification,
  NotificationAction,
} from "../../contexts/NotificationContext";
import { formatDistanceToNow } from "date-fns";

export default function NotificationPanel() {
  const {
    notifications,
    unreadCount,
    isLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    handleNotificationAction,
  } = useNotifications();

  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "unread") return !notification.isRead;
    if (filter === "read") return notification.isRead;
    return true;
  });

  const displayNotifications = showAll
    ? filteredNotifications
    : filteredNotifications.slice(0, 5);

  const handleMarkAsRead = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead([notification._id]);
    }
  };

  const handleNotificationClick = (
    notification: Notification,
    action?: NotificationAction
  ) => {
    handleMarkAsRead(notification);

    if (action) {
      handleNotificationAction(notification, action);
    } else if (notification.data?.url) {
      window.location.href = notification.data.url;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-red-500 bg-red-50";
      case "high":
        return "border-orange-500 bg-orange-50";
      case "medium":
        return "border-blue-500 bg-blue-50";
      case "low":
        return "border-gray-500 bg-gray-50";
      default:
        return "border-gray-300 bg-white";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "message":
        return "💬";
      case "booking_created":
      case "booking_updated":
      case "booking_confirmed":
      case "booking_cancelled":
        return "📅";
      case "price_offer":
      case "price_accepted":
      case "price_rejected":
        return "💰";
      case "payment_due":
      case "payment_received":
        return "💳";
      case "service_review":
        return "⭐";
      case "system":
        return "🔧";
      case "admin_message":
        return "👨‍💼";
      default:
        return "🔔";
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className=""
              onClick={refreshNotifications}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className=""
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex space-x-1">
          {["all", "unread", "read"].map((filterType) => (
            <Button
              key={filterType}
              variant={filter === filterType ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(filterType as any)}
              className="text-xs"
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="max-h-96 overflow-y-auto space-y-2">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">
            Loading notifications...
          </div>
        ) : displayNotifications.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            {filter === "all"
              ? "No notifications"
              : `No ${filter} notifications`}
          </div>
        ) : (
          displayNotifications.map((notification) => (
            <div
              key={notification._id}
              className={`p-3 rounded-lg border-l-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                !notification.isRead
                  ? "bg-blue-50 border-l-blue-500"
                  : "bg-white border-l-gray-300"
              } ${getPriorityColor(notification.priority)}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">
                      {getTypeIcon(notification.type)}
                    </span>
                    <h4 className="font-medium text-sm text-gray-900">
                      {notification.title}
                    </h4>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 mb-2">
                    {notification.message}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </span>

                    {notification.priority === "urgent" && (
                      <Badge className="text-xs bg-red-500 text-white">
                        Urgent
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {notification.actions && notification.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {notification.actions.slice(0, 2).map((action, index) => (
                        <Button
                          key={index}
                          variant={
                            action.style === "primary" ? "default" : "outline"
                          }
                          size="sm"
                          className="text-xs px-2 py-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(notification, action);
                          }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-1 ml-2">
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className=""
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead([notification._id]);
                      }}
                      title="Mark as read"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className=""
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification._id);
                    }}
                    title="Delete notification"
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}

        {filteredNotifications.length > 5 && !showAll && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-blue-600"
            onClick={() => setShowAll(true)}
          >
            Show all {filteredNotifications.length} notifications
          </Button>
        )}

        {showAll && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-gray-600"
            onClick={() => setShowAll(false)}
          >
            Show less
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
