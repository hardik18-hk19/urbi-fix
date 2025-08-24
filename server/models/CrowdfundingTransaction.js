import mongoose from "mongoose";

const crowdfundingTransactionSchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
    },
    contributor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "wallet", "bank_transfer"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
      maxlength: 500,
    },
    refundedAt: {
      type: Date,
    },
    refundReason: {
      type: String,
    },
    completedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
  },
  { timestamps: true }
);

// Indexes for performance
crowdfundingTransactionSchema.index({ issue: 1 });
crowdfundingTransactionSchema.index({ contributor: 1 });
crowdfundingTransactionSchema.index({ transactionId: 1 });
crowdfundingTransactionSchema.index({ status: 1 });

const CrowdfundingTransaction = mongoose.model(
  "CrowdfundingTransaction",
  crowdfundingTransactionSchema
);

export default CrowdfundingTransaction;
