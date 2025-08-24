import mongoose from "mongoose";

const providerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    businessInfo: {
      businessName: {
        type: String,
        required: true,
      },
      businessType: {
        type: String,
        enum: ["individual", "company", "franchise"],
        default: "individual",
      },
      registrationNumber: {
        type: String,
        unique: true,
        sparse: true,
      },
      taxId: {
        type: String,
        unique: true,
        sparse: true,
      },
    },
    contactInfo: {
      phoneNumber: {
        type: String,
        required: true,
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
      website: {
        type: String,
        default: "",
      },
    },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
      },
    ],
    serviceArea: {
      radius: {
        type: Number,
        default: 15, // kilometers
      },
      center: {
        latitude: {
          type: Number,
          required: true,
        },
        longitude: {
          type: Number,
          required: true,
        },
      },
    },
    availability: {
      schedule: {
        monday: {
          isAvailable: { type: Boolean, default: true },
          start: { type: String, default: "09:00" },
          end: { type: String, default: "17:00" },
        },
        tuesday: {
          isAvailable: { type: Boolean, default: true },
          start: { type: String, default: "09:00" },
          end: { type: String, default: "17:00" },
        },
        wednesday: {
          isAvailable: { type: Boolean, default: true },
          start: { type: String, default: "09:00" },
          end: { type: String, default: "17:00" },
        },
        thursday: {
          isAvailable: { type: Boolean, default: true },
          start: { type: String, default: "09:00" },
          end: { type: String, default: "17:00" },
        },
        friday: {
          isAvailable: { type: Boolean, default: true },
          start: { type: String, default: "09:00" },
          end: { type: String, default: "17:00" },
        },
        saturday: {
          isAvailable: { type: Boolean, default: false },
          start: { type: String, default: "09:00" },
          end: { type: String, default: "17:00" },
        },
        sunday: {
          isAvailable: { type: Boolean, default: false },
          start: { type: String, default: "09:00" },
          end: { type: String, default: "17:00" },
        },
      },
      emergencyAvailable: {
        type: Boolean,
        default: false,
      },
    },
    verification: {
      isVerified: {
        type: Boolean,
        default: false,
      },
      documents: [
        {
          type: {
            type: String,
            enum: ["license", "insurance", "certification", "id"],
          },
          url: String,
          verifiedAt: Date,
          verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        },
      ],
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    pricing: {
      basePrice: {
        type: Number,
        default: 0,
      },
      hourlyRate: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: "USD",
      },
    },
    preferences: {
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        sms: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
      autoAcceptBookings: {
        type: Boolean,
        default: false,
      },
      maxBookingsPerDay: {
        type: Number,
        default: 10,
      },
    },
    statistics: {
      totalJobs: {
        type: Number,
        default: 0,
      },
      completedJobs: {
        type: Number,
        default: 0,
      },
      cancelledJobs: {
        type: Number,
        default: 0,
      },
      totalEarnings: {
        type: Number,
        default: 0,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for geospatial queries
providerSchema.index({ "serviceArea.center": "2dsphere" });
providerSchema.index({ "contactInfo.address.coordinates": "2dsphere" });

// Index for text search
providerSchema.index({
  "businessInfo.businessName": "text",
  "user.name": "text",
});

const Provider = mongoose.model("Provider", providerSchema);

export default Provider;
