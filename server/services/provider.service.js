import Provider from "../models/provider.js";
import User from "../models/userModel.js";
import Service from "../models/serviceModel.js";

class ProviderService {
  // Create provider profile
  async createProfile(userId, profileData) {
    // Check if profile already exists
    const existingProvider = await Provider.findOne({ user: userId });
    if (existingProvider) {
      throw new Error("Provider profile already exists");
    }

    const provider = new Provider({
      user: userId,
      ...profileData,
    });

    await provider.save();
    return await this.getProfile(userId);
  }

  // Get provider profile
  async getProfile(userId) {
    const provider = await Provider.findOne({ user: userId })
      .populate("user", "name email phone isActive lastLogin")
      .populate("services", "name description pricing");

    if (!provider) {
      throw new Error("Provider profile not found");
    }

    return provider;
  }

  // Update provider profile
  async updateProfile(userId, updateData) {
    const provider = await Provider.findOne({ user: userId });
    if (!provider) {
      throw new Error("Provider profile not found");
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.user;
    delete updateData.verification;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const updatedProvider = await Provider.findByIdAndUpdate(
      provider._id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("user", "name email phone isActive lastLogin")
      .populate("services", "name description pricing");

    return updatedProvider;
  }

  // Get all providers (admin only)
  async getAllProviders(filters = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      isVerified,
      category,
    } = filters;

    let filter = {};

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    if (isVerified !== undefined) {
      filter["verification.isVerified"] = isVerified;
    }

    if (category) {
      filter.categories = category;
    }

    let providers = await Provider.find(filter)
      .populate("user", "name email phone isActive lastLogin")
      .populate("services", "name description pricing")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Apply search filter after population
    if (search) {
      providers = providers.filter(
        (provider) =>
          provider.user.name.toLowerCase().includes(search.toLowerCase()) ||
          provider.user.email.toLowerCase().includes(search.toLowerCase()) ||
          (provider.profile.businessName &&
            provider.profile.businessName
              .toLowerCase()
              .includes(search.toLowerCase()))
      );
    }

    const total = await Provider.countDocuments(filter);

    return {
      providers,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  // Get provider by ID
  async getProviderById(providerId) {
    const provider = await Provider.findById(providerId)
      .populate("user", "name email phone isActive lastLogin")
      .populate("services", "name description pricing");

    if (!provider) {
      throw new Error("Provider not found");
    }

    return provider;
  }

  // Update provider verification status
  async updateVerificationStatus(providerId, verificationData) {
    const provider = await Provider.findById(providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }

    provider.verification = {
      ...provider.verification,
      ...verificationData,
    };

    await provider.save();

    return await this.getProviderById(providerId);
  }

  // Update provider status
  async updateStatus(providerId, isActive) {
    const provider = await Provider.findByIdAndUpdate(
      providerId,
      { isActive },
      { new: true }
    )
      .populate("user", "name email phone isActive lastLogin")
      .populate("services", "name description pricing");

    if (!provider) {
      throw new Error("Provider not found");
    }

    return provider;
  }

  // Add service to provider
  async addService(userId, serviceData) {
    const provider = await Provider.findOne({ user: userId });
    if (!provider) {
      throw new Error("Provider profile not found");
    }

    // Create the service
    const service = new Service({
      ...serviceData,
      provider: provider._id,
    });

    await service.save();

    // Add service to provider's services array
    provider.services.push(service._id);
    await provider.save();

    return await this.getProfile(userId);
  }

  // Remove service from provider
  async removeService(userId, serviceId) {
    const provider = await Provider.findOne({ user: userId });
    if (!provider) {
      throw new Error("Provider profile not found");
    }

    // Check if service belongs to provider
    const service = await Service.findOne({
      _id: serviceId,
      provider: provider._id,
    });
    if (!service) {
      throw new Error("Service not found or doesn't belong to provider");
    }

    // Remove service from provider's services array
    provider.services.pull(serviceId);
    await provider.save();

    // Delete the service
    await Service.findByIdAndDelete(serviceId);

    return await this.getProfile(userId);
  }

  // Update provider availability
  async updateAvailability(userId, availabilityData) {
    const provider = await Provider.findOne({ user: userId });
    if (!provider) {
      throw new Error("Provider profile not found");
    }

    provider.availability = availabilityData;
    await provider.save();

    return await this.getProfile(userId);
  }

  // Update provider location
  async updateLocation(userId, locationData) {
    const provider = await Provider.findOne({ user: userId });
    if (!provider) {
      throw new Error("Provider profile not found");
    }

    provider.location = {
      ...provider.location,
      ...locationData,
    };

    await provider.save();

    return await this.getProfile(userId);
  }

  // Get nearby providers
  async getNearbyProviders(coordinates, maxDistance = 10000) {
    // 10km default
    const providers = await Provider.find({
      "location.coordinates": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: coordinates, // [longitude, latitude]
          },
          $maxDistance: maxDistance,
        },
      },
      isActive: true,
      "verification.isVerified": true,
    })
      .populate("user", "name email phone")
      .populate("services", "name description pricing")
      .limit(20);

    return providers;
  }

  // Get provider statistics
  async getProviderStats() {
    const stats = {
      total: await Provider.countDocuments(),
      active: await Provider.countDocuments({ isActive: true }),
      verified: await Provider.countDocuments({
        "verification.isVerified": true,
      }),
      pending: await Provider.countDocuments({
        "verification.isVerified": false,
      }),
      online: await Provider.countDocuments({ isOnline: true }),
      today: await Provider.countDocuments({
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
      }),
      thisWeek: await Provider.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      thisMonth: await Provider.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
    };

    return stats;
  }

  // Search providers
  async searchProviders(searchParams) {
    const {
      query,
      category,
      location,
      maxDistance = 10000,
      minRating = 0,
      maxPrice,
      page = 1,
      limit = 10,
    } = searchParams;

    let filter = {
      isActive: true,
      "verification.isVerified": true,
    };

    // Text search
    if (query) {
      filter.$or = [
        { "profile.businessName": { $regex: query, $options: "i" } },
        { "profile.description": { $regex: query, $options: "i" } },
      ];
    }

    // Category filter
    if (category) {
      filter.categories = category;
    }

    // Rating filter
    if (minRating > 0) {
      filter["rating.average"] = { $gte: minRating };
    }

    let providers = await Provider.find(filter)
      .populate("user", "name email phone")
      .populate("services", "name description pricing")
      .sort({ "rating.average": -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Location-based filtering if coordinates provided
    if (location && location.coordinates) {
      providers = await Provider.find({
        ...filter,
        "location.coordinates": {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: location.coordinates,
            },
            $maxDistance: maxDistance,
          },
        },
      })
        .populate("user", "name email phone")
        .populate("services", "name description pricing")
        .limit(limit * 1)
        .skip((page - 1) * limit);
    }

    // Price filter (check services)
    if (maxPrice) {
      providers = providers.filter((provider) =>
        provider.services.some(
          (service) => service.pricing.basePrice <= maxPrice
        )
      );
    }

    const total = await Provider.countDocuments(filter);

    return {
      providers,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }
}

export default new ProviderService();
