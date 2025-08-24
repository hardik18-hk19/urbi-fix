import express from "express";
import {
  getAllUsers,
  getAllIssues,
  getAllServices,
  getAllBookings,
  updateUserStatus,
  verifyProvider,
  getSystemStats,
  deleteUser,
  deleteIssue,
  deleteService,
} from "../controllers/admin.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Middleware to ensure admin access
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Apply authentication and admin check to all routes
router.use(authenticate());
router.use(requireAdmin);

// User management routes
router.get("/users", getAllUsers);
router.put("/users/:id/status", updateUserStatus);
router.delete("/users/:id", deleteUser);

// Provider verification
router.put("/providers/:id/verify", verifyProvider);

// System statistics
router.get("/stats", getSystemStats);

// Issue management
router.get("/issues", getAllIssues);
router.delete("/issues/:id", deleteIssue);

// Service management
router.get("/services", getAllServices);
router.delete("/services/:id", deleteService);

// Booking management
router.get("/bookings", getAllBookings);

export default router;
