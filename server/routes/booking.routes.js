import express from "express";
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  getProviderStats,
} from "../controllers/booking.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Routes
router
  .route("/")
  .get(authenticate(["admin", "provider", "consumer"]), getAllBookings)
  .post(authenticate(["consumer"]), createBooking);
router
  .route("/:id")
  .get(authenticate(["admin", "provider", "consumer"]), getBookingById)
  .patch(authenticate(["admin", "provider", "consumer"]), updateBooking)
  .delete(authenticate(["admin", "consumer"]), deleteBooking);

// Provider stats route
router.get("/provider/stats", authenticate(["provider"]), getProviderStats);

export default router;
