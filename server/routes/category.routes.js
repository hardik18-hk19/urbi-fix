import express from "express";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
} from "../controllers/category.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Get all categories (public - for browsing)
router.get("/", getAllCategories);

// Get category by ID (public)
router.get("/:id", getCategoryById);

// Create new category (admin only)
router.post("/", authenticate(["admin"]), createCategory);

// Update category (admin only)
router.put("/:id", authenticate(["admin"]), updateCategory);

// Toggle category status (activate/deactivate) (admin only)
router.patch(
  "/:id/toggle-status",
  authenticate(["admin"]),
  toggleCategoryStatus
);

// Delete category (admin only)
router.delete("/:id", authenticate(["admin"]), deleteCategory);

export default router;
