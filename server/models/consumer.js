import mongoose from "mongoose";

const consumerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    address: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipCode: {
        type: String,
        required: true,
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    preferences: {
      serviceRadius: {
        type: Number,
        default: 10, // kilometers
      },
      preferredProviders: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        sms: {
          type: Boolean,
          default: false,
        },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Consumer = mongoose.model("Consumer", consumerSchema);

export default Consumer;
