import Booking from "../models/Booking.js";
import Service from "../models/serviceModel.js";
import Provider from "../models/provider.js";
import Consumer from "../models/consumer.js";

class BookingService {
  // Create new booking
  async createBooking(bookingData, consumerId) {
    const {
      serviceId,
      providerId,
      scheduledDate,
      scheduledTime,
      location,
      notes,
      estimatedDuration,
    } = bookingData;

    // Validate service exists
    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      throw new Error("Service not found or inactive");
    }

    // Validate provider exists and is active
    const provider = await Provider.findById(providerId);
    if (!provider || !provider.isActive) {
      throw new Error("Provider not found or inactive");
    }

    // Check if provider offers this service
    const providerOffersService = provider.services.includes(serviceId);
    if (!providerOffersService) {
      throw new Error("Provider does not offer this service");
    }

    // Check provider availability (basic check)
    const conflictingBooking = await Booking.findOne({
      provider: providerId,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      status: { $in: ["pending", "confirmed", "in_progress"] },
    });

    if (conflictingBooking) {
      throw new Error("Provider is not available at the requested time");
    }

    // Create booking
    const booking = new Booking({
      consumer: consumerId,
      provider: providerId,
      service: serviceId,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      location,
      notes,
      estimatedDuration,
      totalAmount: service.pricing.basePrice,
      status: "pending",
    });

    await booking.save();

    return await this.getBookingById(booking._id);
  }

  // Get booking by ID with population
  async getBookingById(bookingId) {
    const booking = await Booking.findById(bookingId)
      .populate("consumer", "profile")
      .populate("provider", "profile")
      .populate("service", "name description pricing");

    if (!booking) {
      throw new Error("Booking not found");
    }

    return booking;
  }

  // Get bookings for user (consumer or provider)
  async getUserBookings(userId, userRole, filters = {}) {
    const { page = 1, limit = 10, status } = filters;

    let filter = {};

    if (userRole === "consumer") {
      const consumer = await Consumer.findOne({ user: userId });
      if (!consumer) {
        throw new Error("Consumer profile not found");
      }
      filter.consumer = consumer._id;
    } else if (userRole === "provider") {
      const provider = await Provider.findOne({ user: userId });
      if (!provider) {
        throw new Error("Provider profile not found");
      }
      filter.provider = provider._id;
    }

    if (status) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate("consumer", "profile")
      .populate("provider", "profile")
      .populate("service", "name description pricing")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(filter);

    return {
      bookings,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  // Update booking status
  async updateBookingStatus(
    bookingId,
    status,
    userId,
    userRole,
    additionalData = {}
  ) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    // Validate status
    const validStatuses = [
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status");
    }

    // Check permissions
    let canUpdate = false;

    if (userRole === "provider") {
      const provider = await Provider.findOne({ user: userId });
      canUpdate = booking.provider.toString() === provider._id.toString();
    } else if (userRole === "consumer") {
      const consumer = await Consumer.findOne({ user: userId });
      canUpdate =
        booking.consumer.toString() === consumer._id.toString() &&
        status === "cancelled"; // Consumers can only cancel
    } else if (userRole === "admin") {
      canUpdate = true;
    }

    if (!canUpdate) {
      throw new Error("Access denied");
    }

    // Prevent invalid status transitions
    if (booking.status === "completed" && status !== "completed") {
      throw new Error("Cannot change status of completed booking");
    }

    if (booking.status === "cancelled" && status !== "cancelled") {
      throw new Error("Cannot change status of cancelled booking");
    }

    const updateData = { status, ...additionalData };

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      updateData,
      { new: true }
    )
      .populate("consumer", "profile")
      .populate("provider", "profile")
      .populate("service", "name description pricing");

    return updatedBooking;
  }

  // Cancel booking
  async cancelBooking(bookingId, reason, userId, userRole) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.status === "cancelled") {
      throw new Error("Booking is already cancelled");
    }

    if (booking.status === "completed") {
      throw new Error("Cannot cancel completed booking");
    }

    // Check permissions
    let canCancel = false;

    if (userRole === "consumer") {
      const consumer = await Consumer.findOne({ user: userId });
      canCancel = booking.consumer.toString() === consumer._id.toString();
    } else if (userRole === "provider") {
      const provider = await Provider.findOne({ user: userId });
      canCancel = booking.provider.toString() === provider._id.toString();
    } else if (userRole === "admin") {
      canCancel = true;
    }

    if (!canCancel) {
      throw new Error("Access denied");
    }

    return await this.updateBookingStatus(
      bookingId,
      "cancelled",
      userId,
      userRole,
      { cancellationReason: reason || "No reason provided" }
    );
  }

  // Get booking statistics
  async getBookingStats() {
    const stats = {
      total: await Booking.countDocuments(),
      pending: await Booking.countDocuments({ status: "pending" }),
      confirmed: await Booking.countDocuments({ status: "confirmed" }),
      inProgress: await Booking.countDocuments({ status: "in_progress" }),
      completed: await Booking.countDocuments({ status: "completed" }),
      cancelled: await Booking.countDocuments({ status: "cancelled" }),
      today: await Booking.countDocuments({
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
      }),
      thisWeek: await Booking.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      thisMonth: await Booking.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
    };

    return stats;
  }

  // Get upcoming bookings for provider
  async getProviderUpcomingBookings(providerId, limit = 5) {
    const provider = await Provider.findOne({ user: providerId });
    if (!provider) {
      throw new Error("Provider profile not found");
    }

    const bookings = await Booking.find({
      provider: provider._id,
      status: { $in: ["confirmed", "pending"] },
      scheduledDate: { $gte: new Date() },
    })
      .populate("consumer", "profile")
      .populate("service", "name description")
      .sort({ scheduledDate: 1 })
      .limit(limit);

    return bookings;
  }

  // Get booking history for consumer
  async getConsumerBookingHistory(consumerId, limit = 10) {
    const consumer = await Consumer.findOne({ user: consumerId });
    if (!consumer) {
      throw new Error("Consumer profile not found");
    }

    const bookings = await Booking.find({
      consumer: consumer._id,
      status: { $in: ["completed", "cancelled"] },
    })
      .populate("provider", "profile")
      .populate("service", "name description")
      .sort({ updatedAt: -1 })
      .limit(limit);

    return bookings;
  }
}

export default new BookingService();
