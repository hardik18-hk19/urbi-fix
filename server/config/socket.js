import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import env from "./env.js";

// Store active users and their socket connections
const activeUsers = new Map();
const userRooms = new Map(); // Track which chat rooms each user has joined

export const configureSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Authentication middleware for socket connections
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication token required"));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error("Invalid authentication token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User ${socket.userId} connected with socket ${socket.id}`);

    // Store user connection
    activeUsers.set(socket.userId, {
      socketId: socket.id,
      userId: socket.userId,
      role: socket.userRole,
      connectedAt: new Date(),
    });

    // Emit online status to other users
    socket.broadcast.emit("user_online", {
      userId: socket.userId,
      timestamp: new Date(),
    });

    // Join user to their personal notification room
    socket.join(`user_${socket.userId}`);

    // Handle joining chat rooms
    socket.on("join_chat_room", (chatRoomId) => {
      console.log(`User ${socket.userId} joining chat room ${chatRoomId}`);
      socket.join(chatRoomId);

      // Track user's active chat rooms
      if (!userRooms.has(socket.userId)) {
        userRooms.set(socket.userId, new Set());
      }
      userRooms.get(socket.userId).add(chatRoomId);

      // Notify others in the room that user joined
      socket.to(chatRoomId).emit("user_joined_chat", {
        userId: socket.userId,
        chatRoomId,
        timestamp: new Date(),
      });
    });

    // Handle leaving chat rooms
    socket.on("leave_chat_room", (chatRoomId) => {
      console.log(`User ${socket.userId} leaving chat room ${chatRoomId}`);
      socket.leave(chatRoomId);

      // Remove from user's active chat rooms
      if (userRooms.has(socket.userId)) {
        userRooms.get(socket.userId).delete(chatRoomId);
      }

      // Notify others in the room that user left
      socket.to(chatRoomId).emit("user_left_chat", {
        userId: socket.userId,
        chatRoomId,
        timestamp: new Date(),
      });
    });

    // Handle typing indicators
    socket.on("typing_start", ({ chatRoomId, userName }) => {
      socket.to(chatRoomId).emit("user_typing", {
        userId: socket.userId,
        userName,
        chatRoomId,
        timestamp: new Date(),
      });
    });

    socket.on("typing_stop", ({ chatRoomId }) => {
      socket.to(chatRoomId).emit("user_stopped_typing", {
        userId: socket.userId,
        chatRoomId,
        timestamp: new Date(),
      });
    });

    // Handle message read receipts
    socket.on("mark_messages_read", ({ chatRoomId, messageIds }) => {
      socket.to(chatRoomId).emit("messages_read", {
        userId: socket.userId,
        chatRoomId,
        messageIds,
        timestamp: new Date(),
      });
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`User ${socket.userId} disconnected: ${reason}`);

      // Remove from active users
      activeUsers.delete(socket.userId);

      // Clean up user rooms
      if (userRooms.has(socket.userId)) {
        const rooms = userRooms.get(socket.userId);
        rooms.forEach((roomId) => {
          socket.to(roomId).emit("user_left_chat", {
            userId: socket.userId,
            chatRoomId: roomId,
            timestamp: new Date(),
          });
        });
        userRooms.delete(socket.userId);
      }

      // Emit offline status to other users
      socket.broadcast.emit("user_offline", {
        userId: socket.userId,
        timestamp: new Date(),
      });
    });

    // Handle live location sharing
    socket.on("share_location", ({ chatRoomId, location }) => {
      socket.to(chatRoomId).emit("location_shared", {
        userId: socket.userId,
        chatRoomId,
        location,
        timestamp: new Date(),
      });
    });

    // Handle voice message status
    socket.on("voice_message_status", ({ chatRoomId, status }) => {
      socket.to(chatRoomId).emit("voice_message_update", {
        userId: socket.userId,
        chatRoomId,
        status, // 'recording', 'stopped', 'sending'
        timestamp: new Date(),
      });
    });
  });

  return io;
};

// Helper functions to emit events from controllers
export const emitToUser = (io, userId, event, data) => {
  io.to(`user_${userId}`).emit(event, data);
};

export const emitToChatRoom = (io, chatRoomId, event, data) => {
  io.to(chatRoomId).emit(event, data);
};

export const emitToAllUsers = (io, event, data) => {
  io.emit(event, data);
};

export const getActiveUsers = () => {
  return Array.from(activeUsers.values());
};

export const isUserOnline = (userId) => {
  return activeUsers.has(userId);
};

export const getUserRooms = (userId) => {
  return userRooms.get(userId) || new Set();
};
