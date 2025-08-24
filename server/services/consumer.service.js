import Consumer from "../models/consumer.js";
import User from "../models/userModel.js";

class ConsumerService {
  // Create consumer profile
  async createProfile(userId, profileData) {
    // Check if profile already exists
    const existingConsumer = await Consumer.findOne({ user: userId });
    if (existingConsumer) {
      throw new Error("Consumer profile already exists");
    }

    const consumer = new Consumer({
      user: userId,
      ...profileData,
    });

    await consumer.save();
    return await this.getProfile(userId);
  }

  // Get consumer profile
  async getProfile(userId) {
    const consumer = await Consumer.findOne({ user: userId }).populate(
      "user",
      "name email phone isActive lastLogin"
    );

    if (!consumer) {
      throw new Error("Consumer profile not found");
    }

    return consumer;
  }

  // Update consumer profile
  async updateProfile(userId, updateData) {
    const consumer = await Consumer.findOne({ user: userId });
    if (!consumer) {
      throw new Error("Consumer profile not found");
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.user;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const updatedConsumer = await Consumer.findByIdAndUpdate(
      consumer._id,
      updateData,
      { new: true, runValidators: true }
    ).populate("user", "name email phone isActive lastLogin");

    return updatedConsumer;
  }

  // Get all consumers (admin only)
  async getAllConsumers(filters = {}) {
    const { page = 1, limit = 10, search, isActive } = filters;

    let filter = {};

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    let consumers = await Consumer.find(filter)
      .populate("user", "name email phone isActive lastLogin")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Apply search filter after population
    if (search) {
      consumers = consumers.filter(
        (consumer) =>
          consumer.user.name.toLowerCase().includes(search.toLowerCase()) ||
          consumer.user.email.toLowerCase().includes(search.toLowerCase()) ||
          (consumer.profile.firstName &&
            consumer.profile.firstName
              .toLowerCase()
              .includes(search.toLowerCase())) ||
          (consumer.profile.lastName &&
            consumer.profile.lastName
              .toLowerCase()
              .includes(search.toLowerCase()))
      );
    }

    const total = await Consumer.countDocuments(filter);

    return {
      consumers,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  // Get consumer by ID
  async getConsumerById(consumerId) {
    const consumer = await Consumer.findById(consumerId).populate(
      "user",
      "name email phone isActive lastLogin"
    );

    if (!consumer) {
      throw new Error("Consumer not found");
    }

    return consumer;
  }

  // Update consumer status
  async updateStatus(consumerId, isActive) {
    const consumer = await Consumer.findByIdAndUpdate(
      consumerId,
      { isActive },
      { new: true }
    ).populate("user", "name email phone isActive lastLogin");

    if (!consumer) {
      throw new Error("Consumer not found");
    }

    return consumer;
  }

  // Delete consumer profile
  async deleteProfile(userId) {
    const consumer = await Consumer.findOne({ user: userId });
    if (!consumer) {
      throw new Error("Consumer profile not found");
    }

    await Consumer.findByIdAndDelete(consumer._id);
    return { message: "Consumer profile deleted successfully" };
  }

  // Add address to consumer
  async addAddress(userId, addressData) {
    const consumer = await Consumer.findOne({ user: userId });
    if (!consumer) {
      throw new Error("Consumer profile not found");
    }

    consumer.addresses.push(addressData);
    await consumer.save();

    return await this.getProfile(userId);
  }

  // Update address
  async updateAddress(userId, addressId, addressData) {
    const consumer = await Consumer.findOne({ user: userId });
    if (!consumer) {
      throw new Error("Consumer profile not found");
    }

    const address = consumer.addresses.id(addressId);
    if (!address) {
      throw new Error("Address not found");
    }

    Object.assign(address, addressData);
    await consumer.save();

    return await this.getProfile(userId);
  }

  // Remove address
  async removeAddress(userId, addressId) {
    const consumer = await Consumer.findOne({ user: userId });
    if (!consumer) {
      throw new Error("Consumer profile not found");
    }

    consumer.addresses.id(addressId).remove();
    await consumer.save();

    return await this.getProfile(userId);
  }

  // Get consumer statistics
  async getConsumerStats() {
    const stats = {
      total: await Consumer.countDocuments(),
      active: await Consumer.countDocuments({ isActive: true }),
      inactive: await Consumer.countDocuments({ isActive: false }),
      withProfiles: await Consumer.countDocuments({
        "profile.firstName": { $exists: true, $ne: "" },
      }),
      today: await Consumer.countDocuments({
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
      }),
      thisWeek: await Consumer.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      thisMonth: await Consumer.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
    };

    return stats;
  }
}

export default new ConsumerService();
