import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: false, // Made optional
    },
    consumer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "negotiating",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "rejected",
      ],
      default: "pending",
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    originalAmount: {
      type: Number,
      required: true,
    },
    negotiatedAmount: {
      type: Number,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "partial_refund"],
      default: "pending",
    },
    notes: {
      type: String,
      default: "",
    },
    consumerNotes: {
      type: String,
      default: "",
    },
    providerNotes: {
      type: String,
      default: "",
    },
    negotiationData: {
      isNegotiated: {
        type: Boolean,
        default: false,
      },
      priceHistory: [
        {
          amount: Number,
          proposedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          proposedAt: {
            type: Date,
            default: Date.now,
          },
          message: String,
        },
      ],
      scheduleHistory: [
        {
          scheduledDate: Date,
          proposedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          proposedAt: {
            type: Date,
            default: Date.now,
          },
          reason: String,
        },
      ],
      requirementHistory: [
        {
          requirements: String,
          proposedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          proposedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    chatRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
    },
    attachments: [
      {
        type: {
          type: String,
          enum: ["image", "document", "video"],
        },
        url: String,
        filename: String,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
