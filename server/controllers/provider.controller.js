import Provider from "../models/provider.js";
import User from "../models/userModel.js";
import mongoose from "mongoose";

// Get provider profile
export const getProviderProfile = async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user.id })
      .populate("user", "name email")
      .populate("services", "name description pricing");

    if (!provider) {
      return res.status(404).json({ message: "Provider profile not found" });
    }

    res.status(200).json({
      success: true,
      data: provider,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Create provider profile
export const createProviderProfile = async (req, res) => {
  try {
    // Check if provider profile already exists
    const existingProvider = await Provider.findOne({ user: req.user.id });
    if (existingProvider) {
      return res
        .status(409)
        .json({ message: "Provider profile already exists" });
    }

    const {
      businessInfo,
      contactInfo,
      serviceArea,
      availability,
      pricing,
      preferences,
    } = req.body;

    // Validate required fields
    if (
      !businessInfo?.businessName ||
      !contactInfo?.phoneNumber ||
      !contactInfo?.address ||
      !serviceArea?.center
    ) {
      return res.status(400).json({
        message:
          "Business name, phone number, address, and service area are required",
      });
    }

    const provider = new Provider({
      user: req.user.id,
      businessInfo,
      contactInfo,
      serviceArea,
      availability,
      pricing,
      preferences,
    });

    await provider.save();

    const populatedProvider = await Provider.findById(provider._id)
      .populate("user", "name email")
      .populate("services", "name description pricing");

    res.status(201).json({
      success: true,
      message: "Provider profile created successfully",
      data: populatedProvider,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update provider profile
export const updateProviderProfile = async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user.id });

    if (!provider) {
      return res.status(404).json({ message: "Provider profile not found" });
    }

    const updateFields = { ...req.body };
    delete updateFields.user; // Prevent updating user reference
    delete updateFields.statistics; // Prevent updating statistics directly
    delete updateFields.rating; // Prevent updating rating directly

    const updatedProvider = await Provider.findByIdAndUpdate(
      provider._id,
      updateFields,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("user", "name email")
      .populate("services", "name description pricing");

    res.status(200).json({
      success: true,
      message: "Provider profile updated successfully",
      data: updatedProvider,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete provider profile
export const deleteProviderProfile = async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user.id });

    if (!provider) {
      return res.status(404).json({ message: "Provider profile not found" });
    }

    await Provider.findByIdAndDelete(provider._id);

    res.status(200).json({
      success: true,
      message: "Provider profile deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all providers (public - for browsing)
export const getAllProviders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      location,
      radius = 10,
      verified,
      rating,
      available,
    } = req.query;

    const filter = { isActive: true };

    // Filter by verification status
    if (verified !== undefined) {
      filter["verification.isVerified"] = verified === "true";
    }

    // Filter by minimum rating
    if (rating) {
      filter["rating.average"] = { $gte: parseFloat(rating) };
    }

    // Filter by online status
    if (available !== undefined) {
      filter.isOnline = available === "true";
    }

    // Geospatial filter for location
    let query = Provider.find(filter);

    if (location && radius) {
      const [longitude, latitude] = location.split(",").map(Number);
      query = query.where("serviceArea.center").near({
        center: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        maxDistance: radius * 1000, // Convert km to meters
      });
    }

    const providers = await query
      .populate("user", "name email")
      .populate("services", "name description category pricing")
      .sort({ "rating.average": -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Provider.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: providers,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get provider by ID (public)
export const getProviderById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid provider ID format" });
    }

    const provider = await Provider.findById(id)
      .populate("user", "name email")
      .populate("services", "name description category pricing");

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    res.status(200).json({
      success: true,
      data: provider,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update provider availability status
export const updateAvailabilityStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;

    const provider = await Provider.findOneAndUpdate(
      { user: req.user.id },
      { isOnline },
      { new: true }
    ).populate("user", "name email");

    if (!provider) {
      return res.status(404).json({ message: "Provider profile not found" });
    }

    res.status(200).json({
      success: true,
      message: `Provider is now ${isOnline ? "online" : "offline"}`,
      data: { isOnline: provider.isOnline },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update provider schedule
export const updateSchedule = async (req, res) => {
  try {
    const { schedule } = req.body;

    const provider = await Provider.findOneAndUpdate(
      { user: req.user.id },
      { "availability.schedule": schedule },
      { new: true, runValidators: true }
    ).populate("user", "name email");

    if (!provider) {
      return res.status(404).json({ message: "Provider profile not found" });
    }

    res.status(200).json({
      success: true,
      message: "Schedule updated successfully",
      data: provider.availability.schedule,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Add service to provider
export const addService = async (req, res) => {
  try {
    const { serviceId } = req.body;

    const provider = await Provider.findOneAndUpdate(
      { user: req.user.id },
      { $addToSet: { services: serviceId } },
      { new: true }
    )
      .populate("user", "name email")
      .populate("services", "name description pricing");

    if (!provider) {
      return res.status(404).json({ message: "Provider profile not found" });
    }

    res.status(200).json({
      success: true,
      message: "Service added successfully",
      data: provider.services,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Remove service from provider
export const removeService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const provider = await Provider.findOneAndUpdate(
      { user: req.user.id },
      { $pull: { services: serviceId } },
      { new: true }
    )
      .populate("user", "name email")
      .populate("services", "name description pricing");

    if (!provider) {
      return res.status(404).json({ message: "Provider profile not found" });
    }

    res.status(200).json({
      success: true,
      message: "Service removed successfully",
      data: provider.services,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get provider statistics
export const getProviderStatistics = async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user.id }).select(
      "statistics rating"
    );

    if (!provider) {
      return res.status(404).json({ message: "Provider profile not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        statistics: provider.statistics,
        rating: provider.rating,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get provider bookings
export const getProviderBookings = async (req, res) => {
  try {
    const Booking = (await import("../models/Booking.js")).default;

    const bookings = await Booking.find({ provider: req.user.id })
      .populate("consumer", "name email")
      .populate("service", "name description price")
      .populate("issue", "title description")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Verify provider (admin only)
export const verifyProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { documentType, isApproved } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ message: "Invalid provider ID format" });
    }

    const updateData = isApproved
      ? {
          "verification.isVerified": true,
          "verification.verifiedAt": new Date(),
          "verification.verifiedBy": req.user.id,
        }
      : {
          "verification.isVerified": false,
        };

    const provider = await Provider.findByIdAndUpdate(providerId, updateData, {
      new: true,
    }).populate("user", "name email");

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    res.status(200).json({
      success: true,
      message: `Provider ${isApproved ? "verified" : "rejected"} successfully`,
      data: provider.verification,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
