import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messageType: {
      type: String,
      enum: [
        "text",
        "image",
        "document",
        "location",
        "system",
        "price_offer",
        "schedule_modification",
        "requirement_update",
      ],
      default: "text",
    },
    content: {
      text: String,
      attachments: [
        {
          type: {
            type: String,
            enum: ["image", "document", "video"],
          },
          url: String,
          filename: String,
          size: Number,
        },
      ],
      priceOffer: {
        amount: Number,
        description: String,
        validUntil: Date,
      },
      scheduleModification: {
        proposedDate: Date,
        proposedTime: String,
        reason: String,
      },
      requirementUpdate: {
        updatedRequirements: String,
        estimatedTimeChange: String,
        additionalCosts: Number,
      },
      location: {
        latitude: Number,
        longitude: Number,
        address: String,
      },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        emoji: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Indexes for efficient queries
messageSchema.index({ chatRoomId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
