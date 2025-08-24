import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    negotiationData: {
      originalPrice: Number,
      currentOffer: Number,
      counterOffers: [
        {
          offeredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          amount: Number,
          message: String,
          timestamp: {
            type: Date,
            default: Date.now,
          },
          status: {
            type: String,
            enum: ["pending", "accepted", "rejected", "countered"],
            default: "pending",
          },
        },
      ],
      agreedPrice: Number,
      priceNegotiated: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

// Index for efficient queries
chatRoomSchema.index({ bookingId: 1 });
chatRoomSchema.index({ participants: 1 });

const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);

export default ChatRoom;
