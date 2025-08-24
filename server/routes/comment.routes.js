import express from "express";
import {
  getCommentsByIssue,
  createComment,
  updateComment,
  deleteComment,
  voteComment,
  markAsSolution,
} from "../controllers/comment.controller.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.js";

const router = express.Router();

// Get all comments for an issue (optional auth to track user votes)
router.get("/issue/:issueId", optionalAuthenticate, getCommentsByIssue);

// Create a new comment (requires auth)
router.post(
  "/issue/:issueId",
  authenticate(["consumer", "provider", "admin"]),
  createComment
);

// Update a comment (requires auth and ownership)
router.put(
  "/:commentId",
  authenticate(["consumer", "provider", "admin"]),
  updateComment
);

// Delete a comment (requires auth and ownership)
router.delete(
  "/:commentId",
  authenticate(["consumer", "provider", "admin"]),
  deleteComment
);

// Vote on a comment (requires auth)
router.patch(
  "/:commentId/vote",
  authenticate(["consumer", "provider", "admin"]),
  voteComment
);

// Mark comment as solution (requires auth and issue ownership)
router.patch(
  "/:commentId/mark-solution",
  authenticate(["consumer"]),
  markAsSolution
);

export default router;
