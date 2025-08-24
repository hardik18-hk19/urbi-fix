import express from "express";
import {
  getCrowdfundingDetails,
  enableCrowdfunding,
  contributeToCrowdfunding,
  getUserContributions,
  closeCrowdfundingAndAssign,
} from "../controllers/crowdfunding.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Get crowdfunding details for an issue
router.get("/issue/:issueId", getCrowdfundingDetails);

// Enable crowdfunding for an issue (requires auth and ownership)
router.post(
  "/issue/:issueId/enable",
  authenticate(["consumer", "admin"]),
  enableCrowdfunding
);

// Contribute to crowdfunding (requires auth)
router.post(
  "/issue/:issueId/contribute",
  authenticate(["consumer", "provider", "admin"]),
  contributeToCrowdfunding
);

// Get user's contribution history (requires auth)
router.get(
  "/my-contributions",
  authenticate(["consumer", "provider", "admin"]),
  getUserContributions
);

// Close crowdfunding and assign provider (admin only)
router.post(
  "/issue/:issueId/close",
  authenticate(["admin"]),
  closeCrowdfundingAndAssign
);

export default router;
