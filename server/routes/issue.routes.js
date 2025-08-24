import express from "express";
import {
  getAllIssues,
  getIssueById,
  createIssue,
  updateIssue,
  deleteIssue,
  upvoteIssue,
  trackIssueView,
  enableCrowdfunding,
  disableCrowdfunding,
  getAssignedIssuesCount,
  acceptIssue,
  resolveIssue,
  sendIssueToGoverningBody,
  testEmailService,
} from "../controllers/issue.controller.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.js";

const router = express.Router();

// Get assigned issues count for provider
router.get(
  "/assigned/count",
  authenticate(["provider"]),
  getAssignedIssuesCount
);

// Get all issues (admin/provider can see all, consumer sees only their own)
router.get("/", authenticate(["admin", "provider", "consumer"]), getAllIssues);

// Get issue by ID
router.get(
  "/:id",
  authenticate(["admin", "provider", "consumer"]),
  getIssueById
);

// Create new issue (consumer only)
router.post("/", authenticate(["consumer"]), createIssue);

// Accept issue (provider only)
router.post("/:id/accept", authenticate(["provider"]), acceptIssue);

// Resolve issue (provider only)
router.post("/:id/resolve", authenticate(["provider"]), resolveIssue);

// Update issue (consumer can update their own, provider can update assigned ones)
router.put(
  "/:id",
  authenticate(["admin", "provider", "consumer"]),
  updateIssue
);

// Delete issue (consumer can delete their own, admin can delete any)
router.delete("/:id", authenticate(["admin", "consumer"]), deleteIssue);

// Upvote/downvote issue (all authenticated users)
router.patch(
  "/:id/upvote",
  authenticate(["admin", "provider", "consumer"]),
  upvoteIssue
);

// Track issue view for analytics
router.post("/:id/view", optionalAuthenticate, trackIssueView);

// Enable crowdfunding for an issue (consumer/admin only)
router.post(
  "/:id/crowdfunding/enable",
  authenticate(["admin", "consumer"]),
  enableCrowdfunding
);

// Disable crowdfunding for an issue (consumer/admin only)
router.post(
  "/:id/crowdfunding/disable",
  authenticate(["admin"]),
  disableCrowdfunding
);

// Send issue to governing body manually
router.post(
  "/:issueId/send-to-government",
  authenticate(["admin", "consumer"]),
  sendIssueToGoverningBody
);

// Test email service (admin only)
router.get("/admin/test-email", authenticate(["admin"]), testEmailService);

export default router;
