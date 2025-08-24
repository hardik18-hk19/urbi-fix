import Consumer from "../models/consumer.js";
import User from "../models/userModel.js";

export const getConsumerProfile = async (req, res) => {
  try {
    const consumer = await Consumer.findOne({ user: req.user.id })
      .populate("user", "name email")
      .populate("preferences.preferredProviders", "name email");

    if (!consumer) {
      return res.status(404).json({ message: "Consumer profile not found" });
    }

    res.status(200).json({
      success: true,
      data: consumer,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const createConsumerProfile = async (req, res) => {
  try {
    // Check if consumer profile already exists
    const existingConsumer = await Consumer.findOne({ user: req.user.id });
    if (existingConsumer) {
      return res
        .status(409)
        .json({ message: "Consumer profile already exists" });
    }

    const { address, phoneNumber, preferences } = req.body;

    if (!address || !phoneNumber) {
      return res
        .status(400)
        .json({ message: "Address and phone number are required" });
    }

    const consumer = new Consumer({
      user: req.user.id,
      address,
      phoneNumber,
      preferences,
    });

    await consumer.save();

    res.status(201).json({
      success: true,
      message: "Consumer profile created successfully",
      data: consumer,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const updateConsumerProfile = async (req, res) => {
  try {
    const consumer = await Consumer.findOne({ user: req.user.id });

    if (!consumer) {
      return res.status(404).json({ message: "Consumer profile not found" });
    }

    const updatedConsumer = await Consumer.findByIdAndUpdate(
      consumer._id,
      req.body,
      { new: true, runValidators: true }
    ).populate("user", "name email");

    res.status(200).json({
      success: true,
      message: "Consumer profile updated successfully",
      data: updatedConsumer,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const deleteConsumerProfile = async (req, res) => {
  try {
    const consumer = await Consumer.findOne({ user: req.user.id });

    if (!consumer) {
      return res.status(404).json({ message: "Consumer profile not found" });
    }

    await Consumer.findByIdAndDelete(consumer._id);

    res.status(200).json({
      success: true,
      message: "Consumer profile deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const addPreferredProvider = async (req, res) => {
  try {
    const { providerId } = req.body;

    if (!providerId) {
      return res.status(400).json({ message: "Provider ID is required" });
    }

    // Check if provider exists and has provider role
    const provider = await User.findOne({ _id: providerId, role: "provider" });
    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    const consumer = await Consumer.findOne({ user: req.user.id });
    if (!consumer) {
      return res.status(404).json({ message: "Consumer profile not found" });
    }

    // Check if provider is already in preferred list
    if (consumer.preferences.preferredProviders.includes(providerId)) {
      return res
        .status(409)
        .json({ message: "Provider already in preferred list" });
    }

    consumer.preferences.preferredProviders.push(providerId);
    await consumer.save();

    res.status(200).json({
      success: true,
      message: "Provider added to preferred list",
      data: consumer.preferences.preferredProviders,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const removePreferredProvider = async (req, res) => {
  try {
    const { providerId } = req.params;

    const consumer = await Consumer.findOne({ user: req.user.id });
    if (!consumer) {
      return res.status(404).json({ message: "Consumer profile not found" });
    }

    consumer.preferences.preferredProviders =
      consumer.preferences.preferredProviders.filter(
        (id) => id.toString() !== providerId
      );

    await consumer.save();

    res.status(200).json({
      success: true,
      message: "Provider removed from preferred list",
      data: consumer.preferences.preferredProviders,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getConsumerIssues = async (req, res) => {
  try {
    const Issue = (await import("../models/Issue.js")).default;

    const issues = await Issue.find({ consumer: req.user.id })
      .populate("category", "name description icon")
      .populate("assignedProvider", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: issues,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getConsumerBookings = async (req, res) => {
  try {
    const Booking = (await import("../models/Booking.js")).default;

    const bookings = await Booking.find({ consumer: req.user.id })
      .populate("provider", "name email")
      .populate("service", "name description price category")
      .populate("issue", "title description location")
      .sort({ createdAt: -1 });

    // Debug logging for negotiated bookings
    console.log(`Consumer ${req.user.id} has ${bookings.length} bookings`);
    bookings.forEach((booking, index) => {
      if (booking.negotiationData?.isNegotiated) {
        console.log(
          `Consumer Booking ${index}: Negotiated - Original: ${booking.originalAmount}, Negotiated: ${booking.negotiatedAmount}, Total: ${booking.totalAmount}, Status: ${booking.status}`
        );
      }
    });

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
