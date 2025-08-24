import Booking from "../models/Booking.js";
import Issue from "../models/Issue.js";

export const getAllBookings = async (req, res) => {
  try {
    let filter = {};

    // If consumer, only show their own bookings
    if (req.user.role === "consumer") {
      filter.consumer = req.user.id;
    }

    // If provider, only show bookings assigned to them
    if (req.user.role === "provider") {
      filter.provider = req.user.id;
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    // Status filter
    if (req.query.status) {
      // Handle comma-separated status values
      const statusArray = req.query.status.split(",").map((s) => s.trim());
      if (statusArray.length > 1) {
        filter.status = { $in: statusArray };
      } else {
        filter.status = req.query.status;
      }
    }

    // Get total count for pagination
    const total = await Booking.countDocuments(filter);

    const bookings = await Booking.find(filter)
      .populate("consumer", "name email phone")
      .populate("provider", "name email phone")
      .populate("service", "name description price category")
      .populate("issue", "title description location")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Debug logging to check for null populated fields
    console.log("Fetched bookings count:", bookings.length);
    bookings.forEach((booking, index) => {
      if (!booking.consumer) console.log(`Booking ${index}: Missing consumer`);
      if (!booking.provider) console.log(`Booking ${index}: Missing provider`);
      if (!booking.service) console.log(`Booking ${index}: Missing service`);
      // Log negotiation data for debugging
      if (booking.negotiationData?.isNegotiated) {
        console.log(
          `Booking ${index}: Negotiated - Original: ${booking.originalAmount}, Negotiated: ${booking.negotiatedAmount}, Total: ${booking.totalAmount}`
        );
      }
    });

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("consumer", "name email phone")
      .populate("provider", "name email phone")
      .populate("service", "name description price category")
      .populate("issue", "title description location");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check permissions
    if (
      req.user.role === "consumer" &&
      booking.consumer._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (
      req.user.role === "provider" &&
      booking.provider._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const createBooking = async (req, res) => {
  try {
    const { issue, provider, service, scheduledDate, totalAmount, notes } =
      req.body;

    // Verify required fields
    if (!service) {
      return res.status(400).json({ message: "Service is required" });
    }

    if (!provider) {
      return res.status(400).json({ message: "Provider is required" });
    }

    if (!scheduledDate) {
      return res.status(400).json({ message: "Scheduled date is required" });
    }

    // Verify the issue exists if provided
    if (issue) {
      const existingIssue = await Issue.findById(issue);
      if (!existingIssue) {
        return res.status(404).json({ message: "Issue not found" });
      }

      // Check if issue is already resolved or has an active booking
      const existingBooking = await Booking.findOne({
        issue: issue,
        status: { $in: ["pending", "confirmed", "in_progress"] },
      });

      if (existingBooking) {
        return res.status(400).json({
          message: "This issue already has an active booking",
        });
      }
    }

    const bookingData = {
      consumer: req.user.id,
      provider,
      service,
      scheduledDate,
      totalAmount: totalAmount || 0,
      originalAmount: totalAmount || 0,
      notes: notes || "",
      consumerNotes: notes || "",
      status: "pending",
      paymentStatus: "pending",
      negotiationData: {
        isNegotiated: false,
        priceHistory: [
          {
            amount: totalAmount || 0,
            proposedBy: req.user.id,
            proposedAt: new Date(),
            message: "Initial booking request",
          },
        ],
        scheduleHistory: [
          {
            scheduledDate: new Date(scheduledDate),
            proposedBy: req.user.id,
            proposedAt: new Date(),
            reason: "Initial booking request",
          },
        ],
        requirementHistory: [
          {
            requirements: notes || "",
            proposedBy: req.user.id,
            proposedAt: new Date(),
          },
        ],
      },
    };

    // Only add issue if provided
    if (issue) {
      bookingData.issue = issue;
    }

    const booking = new Booking(bookingData);

    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate("consumer", "name email phone")
      .populate("provider", "name email phone")
      .populate("service", "name description price")
      .populate("issue", "title description location");

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: populatedBooking,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check permissions
    if (
      req.user.role === "consumer" &&
      booking.consumer.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (
      req.user.role === "provider" &&
      booking.provider.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Validate status transitions
    const allowedTransitions = {
      pending: ["negotiating", "confirmed", "cancelled", "rejected"],
      negotiating: ["confirmed", "cancelled", "rejected"],
      confirmed: ["in_progress", "cancelled"],
      in_progress: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
      rejected: [],
    };

    if (
      req.body.status &&
      !allowedTransitions[booking.status].includes(req.body.status)
    ) {
      return res.status(400).json({
        message: `Cannot change status from ${booking.status} to ${req.body.status}`,
      });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate("consumer", "name email phone")
      .populate("provider", "name email phone")
      .populate("service", "name description price")
      .populate("issue", "title description location");

    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      data: updatedBooking,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check permissions
    if (
      req.user.role === "consumer" &&
      booking.consumer.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Only allow deletion of pending bookings
    if (booking.status !== "pending") {
      return res.status(400).json({
        message: "Only pending bookings can be deleted",
      });
    }

    await Booking.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getProviderStats = async (req, res) => {
  try {
    const providerId = req.user.id;

    // Get booking statistics
    const totalBookings = await Booking.countDocuments({
      provider: providerId,
    });
    const completedBookings = await Booking.countDocuments({
      provider: providerId,
      status: "completed",
    });
    const pendingBookings = await Booking.countDocuments({
      provider: providerId,
      status: "pending",
    });
    const cancelledBookings = await Booking.countDocuments({
      provider: providerId,
      status: "cancelled",
    });

    // Calculate earnings
    const completedBookingsWithEarnings = await Booking.find({
      provider: providerId,
      status: "completed",
    });

    const totalEarnings = completedBookingsWithEarnings.reduce(
      (sum, booking) => sum + booking.totalAmount,
      0
    );

    // This month earnings
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const thisMonthBookings = await Booking.find({
      provider: providerId,
      status: "completed",
      updatedAt: { $gte: currentMonth },
    });

    const thisMonthEarnings = thisMonthBookings.reduce(
      (sum, booking) => sum + booking.totalAmount,
      0
    );

    // Calculate completion rate
    const completionRate =
      totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

    // Average rating (placeholder - would need reviews collection)
    const averageRating = 4.5;

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        completedBookings,
        pendingBookings,
        cancelledBookings,
        totalEarnings,
        thisMonthEarnings,
        averageRating,
        completionRate,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
