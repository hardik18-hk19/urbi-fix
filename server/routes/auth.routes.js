import express from "express";
import {
  register,
  login,
  getMe,
  updateProfile,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Register route for all roles
router.post("/register", register);

// Login route for all roles
router.post("/login", login);

// Get current user profile (protected route)
router.get("/me", authenticate(), getMe);

// Update user profile (protected route)
router.put("/update-profile", authenticate(), updateProfile);

export default router;
