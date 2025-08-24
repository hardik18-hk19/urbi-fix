import mongoose from "mongoose";

const proposalSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    proposedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    proposalType: {
      type: String,
      enum: ["price", "schedule", "requirements", "complete"],
      required: true,
    },
    originalData: {
      price: Number,
      scheduledDate: Date,
      requirements: String,
      totalAmount: Number,
    },
    proposedChanges: {
      price: Number,
      scheduledDate: Date,
      requirements: String,
      totalAmount: Number,
      additionalServices: [String],
      estimatedDuration: String,
      specialInstructions: String,
    },
    justification: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "countered", "expired"],
      default: "pending",
    },
    responseMessage: String,
    expiresAt: {
      type: Date,
      required: true,
    },
    negotiationHistory: [
      {
        action: {
          type: String,
          enum: ["created", "accepted", "rejected", "countered", "expired"],
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        message: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        proposalSnapshot: {
          price: Number,
          scheduledDate: Date,
          requirements: String,
        },
      },
    ],
  },
  { timestamps: true }
);

// Indexes
proposalSchema.index({ bookingId: 1, status: 1 });
proposalSchema.index({ proposedBy: 1, status: 1 });
proposalSchema.index({ proposedTo: 1, status: 1 });
proposalSchema.index({ expiresAt: 1 });

// Auto-expire proposals
proposalSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Proposal = mongoose.model("Proposal", proposalSchema);

export default Proposal;
