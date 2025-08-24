import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  createProposal,
  getBookingProposals,
  respondToProposal,
  getUserProposals,
  getProposalById,
  cancelProposal,
} from "../controllers/proposal.controller.js";

const router = express.Router();

// All proposal routes require authentication
router.use(authenticate(["admin", "provider", "consumer"]));

// Get all proposals for a user
router.get("/", getUserProposals);

// Get proposal by ID
router.get("/:proposalId", getProposalById);

// Create a new proposal
router.post("/", createProposal);

// Get proposals for a specific booking
router.get("/booking/:bookingId", getBookingProposals);

// Respond to a proposal
router.post("/:proposalId/respond", respondToProposal);

// Cancel a proposal
router.delete("/:proposalId", cancelProposal);

export default router;
