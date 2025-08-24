import User from "../models/userModel.js";
import Issue from "../models/Issue.js";
import Service from "../models/serviceModel.js";
import Booking from "../models/Booking.js";
import Consumer from "../models/consumer.js";
import Provider from "../models/provider.js";

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

// Update user status
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive", "suspended"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be active, inactive, or suspended",
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: error.message,
    });
  }
};

// Verify provider
export const verifyProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified } = req.body;

    const provider = await Provider.findByIdAndUpdate(
      id,
      { verified },
      { new: true, runValidators: true }
    );

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Provider ${verified ? "verified" : "unverified"} successfully`,
      data: provider,
    });
  } catch (error) {
    console.error("Error verifying provider:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify provider",
      error: error.message,
    });
  }
};

// Get system statistics
export const getSystemStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalConsumers,
      totalProviders,
      verifiedProviders,
      totalIssues,
      openIssues,
      inProgressIssues,
      resolvedIssues,
      totalServices,
      activeServices,
      totalBookings,
      completedBookings,
      pendingBookings,
    ] = await Promise.all([
      User.countDocuments(),
      Consumer.countDocuments(),
      Provider.countDocuments(),
      Provider.countDocuments({ verified: true }),
      Issue.countDocuments(),
      Issue.countDocuments({ status: "open" }),
      Issue.countDocuments({ status: "in_progress" }),
      Issue.countDocuments({ status: "resolved" }),
      Service.countDocuments(),
      Service.countDocuments({ status: "active" }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "completed" }),
      Booking.countDocuments({ status: "pending" }),
    ]);

    const stats = {
      totalUsers,
      totalConsumers,
      totalProviders,
      verifiedProviders,
      totalIssues,
      openIssues,
      inProgressIssues,
      resolvedIssues,
      totalServices,
      activeServices,
      totalBookings,
      completedBookings,
      pendingBookings,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching system stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch system statistics",
      error: error.message,
    });
  }
};

// Get all issues
export const getAllIssues = async (req, res) => {
  try {
    const issues = await Issue.find()
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: issues,
      count: issues.length,
    });
  } catch (error) {
    console.error("Error fetching issues:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch issues",
      error: error.message,
    });
  }
};

// Get all services
export const getAllServices = async (req, res) => {
  try {
    const services = await Service.find()
      .populate("providerId", "name email")
      .populate("categoryId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: services,
      count: services.length,
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch services",
      error: error.message,
    });
  }
};

// Get all bookings
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("serviceId", "title")
      .populate("consumerId", "name email")
      .populate("providerId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: bookings,
      count: bookings.length,
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Also delete related consumer or provider data
    if (user.role === "consumer") {
      await Consumer.findOneAndDelete({ userId: id });
    } else if (user.role === "provider") {
      await Provider.findOneAndDelete({ userId: id });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

// Delete issue
export const deleteIssue = async (req, res) => {
  try {
    const { id } = req.params;

    const issue = await Issue.findByIdAndDelete(id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Issue deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting issue:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete issue",
      error: error.message,
    });
  }
};

// Delete service
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findByIdAndDelete(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete service",
      error: error.message,
    });
  }
};
