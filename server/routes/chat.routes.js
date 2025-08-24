import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getOrCreateChatRoom,
  getChatMessages,
  sendMessage,
  sendPriceOffer,
  respondToPriceOffer,
  uploadChatFile,
  sendScheduleModification,
  getUserChatRooms,
} from "../controllers/chat.controller.js";

const router = express.Router();

// All chat routes require authentication
router.use(authenticate(["admin", "provider", "consumer"]));

// Get user's chat rooms
router.get("/rooms", getUserChatRooms);

// Get or create chat room for a booking
router.get("/booking/:bookingId", getOrCreateChatRoom);

// Get messages for a chat room
router.get("/:chatRoomId/messages", getChatMessages);

// Send a regular message
router.post("/:chatRoomId/messages", sendMessage);

// Send price offer
router.post("/:chatRoomId/price-offer", sendPriceOffer);

// Respond to price offer
router.post("/:chatRoomId/price-offer/:messageId/respond", respondToPriceOffer);

// Upload file to chat
router.post("/:chatRoomId/upload", uploadChatFile);

// Send schedule modification request
router.post("/:chatRoomId/schedule-modification", sendScheduleModification);

export default router;
