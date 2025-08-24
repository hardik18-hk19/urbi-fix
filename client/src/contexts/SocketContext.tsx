"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../hooks/useAuth";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  typingUsers: Map<string, { userId: string; userName: string }>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUsers: new Set(),
  typingUsers: new Map(),
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<
    Map<string, { userId: string; userName: string }>
  >(new Map());
  const { token, user } = useAuth();

  useEffect(() => {
    if (token && user) {
      // Initialize socket connection
      const newSocket = io(
        process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:1011",
        {
          auth: {
            token,
          },
          transports: ["websocket", "polling"],
        }
      );

      // Connection event handlers
      newSocket.on("connect", () => {
        console.log("Connected to socket server");
        setIsConnected(true);
      });

      newSocket.on("disconnect", () => {
        console.log("Disconnected from socket server");
        setIsConnected(false);
        setOnlineUsers(new Set());
        setTypingUsers(new Map());
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setIsConnected(false);
      });

      // User status events
      newSocket.on("user_online", ({ userId }) => {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.add(userId);
          return newSet;
        });
      });

      newSocket.on("user_offline", ({ userId }) => {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        setTypingUsers((prev) => {
          const newMap = new Map(prev);
          newMap.delete(userId);
          return newMap;
        });
      });

      // Typing indicators
      newSocket.on("user_typing", ({ userId, userName, chatRoomId }) => {
        setTypingUsers(
          (prev) =>
            new Map(prev.set(`${chatRoomId}-${userId}`, { userId, userName }))
        );
      });

      newSocket.on("user_stopped_typing", ({ userId, chatRoomId }) => {
        setTypingUsers((prev) => {
          const newMap = new Map(prev);
          newMap.delete(`${chatRoomId}-${userId}`);
          return newMap;
        });
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers(new Set());
        setTypingUsers(new Map());
      };
    }
  }, [token, user]);

  const value: SocketContextType = {
    socket,
    isConnected,
    onlineUsers,
    typingUsers,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
