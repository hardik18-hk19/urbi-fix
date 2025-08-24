import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    location: {
      address: {
        type: String,
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    consumer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    images: [
      {
        type: String, // URLs to uploaded images
      },
    ],
    estimatedCost: {
      type: Number,
      default: null,
    },
    upvotes: {
      type: Number,
      default: 0,
    },
    upvotedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Forum features
    commentsCount: {
      type: Number,
      default: 0,
    },
    // Crowdfunding features
    crowdfunding: {
      isEnabled: {
        type: Boolean,
        default: false,
      },
      targetAmount: {
        type: Number,
        default: 0,
      },
      raisedAmount: {
        type: Number,
        default: 0,
      },
      contributors: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          amount: {
            type: Number,
            required: true,
          },
          contributedAt: {
            type: Date,
            default: Date.now,
          },
          transactionId: String,
          isAnonymous: {
            type: Boolean,
            default: false,
          },
        },
      ],
      deadline: {
        type: Date,
      },
    },
    // Views tracking for forum popularity
    viewsCount: {
      type: Number,
      default: 0,
    },
    viewedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Resolved timestamp
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Issue = mongoose.model("Issue", issueSchema);

export default Issue;
