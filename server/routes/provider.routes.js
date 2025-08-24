import express from "express";
import {
  getProviderProfile,
  createProviderProfile,
  updateProviderProfile,
  deleteProviderProfile,
  getAllProviders,
  getProviderById,
  updateAvailabilityStatus,
  updateSchedule,
  addService,
  removeService,
  getProviderStatistics,
  getProviderBookings,
  verifyProvider,
} from "../controllers/provider.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Provider profile routes (provider role required) - MUST come before /:id route
router.get("/profile/me", authenticate(["provider"]), getProviderProfile);
router.post("/profile", authenticate(["provider"]), createProviderProfile);
router.put("/profile", authenticate(["provider"]), updateProviderProfile);
router.delete("/profile", authenticate(["provider"]), deleteProviderProfile);

// Provider statistics - MUST come before /:id route
router.get("/statistics/me", authenticate(["provider"]), getProviderStatistics);

// Provider bookings - MUST come before /:id route
router.get("/bookings", authenticate(["provider"]), getProviderBookings);

// Public routes
router.get("/", getAllProviders);
router.get("/:id", getProviderById);

// Provider availability management
router.patch(
  "/availability/status",
  authenticate(["provider"]),
  updateAvailabilityStatus
);
router.put(
  "/availability/schedule",
  authenticate(["provider"]),
  updateSchedule
);

// Provider service management
router.post("/services", authenticate(["provider"]), addService);
router.delete(
  "/services/:serviceId",
  authenticate(["provider"]),
  removeService
);

// Admin routes for provider verification
router.patch("/:providerId/verify", authenticate(["admin"]), verifyProvider);

export default router;
