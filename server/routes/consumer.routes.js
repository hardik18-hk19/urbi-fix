import express from "express";
import {
  getConsumerProfile,
  createConsumerProfile,
  updateConsumerProfile,
  deleteConsumerProfile,
  addPreferredProvider,
  removePreferredProvider,
  getConsumerIssues,
  getConsumerBookings,
} from "../controllers/consumer.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Consumer profile routes (consumer role required)
router.get("/profile", authenticate(["consumer"]), getConsumerProfile);
router.post("/profile", authenticate(["consumer"]), createConsumerProfile);
router.put("/profile", authenticate(["consumer"]), updateConsumerProfile);
router.delete("/profile", authenticate(["consumer"]), deleteConsumerProfile);

// Preferred providers management
router.post(
  "/preferred-providers",
  authenticate(["consumer"]),
  addPreferredProvider
);
router.delete(
  "/preferred-providers/:providerId",
  authenticate(["consumer"]),
  removePreferredProvider
);

// Consumer's issues and bookings
router.get("/issues", authenticate(["consumer"]), getConsumerIssues);
router.get("/bookings", authenticate(["consumer"]), getConsumerBookings);

export default router;
