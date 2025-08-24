import Service from "../models/serviceModel.js";
import Provider from "../models/provider.js";
import Category from "../models/category.js";

class ServiceService {
  // Create new service
  async createService(userId, serviceData) {
    const provider = await Provider.findOne({ user: userId });
    if (!provider) {
      throw new Error("Provider profile not found");
    }

    // Validate category exists
    if (serviceData.category) {
      const category = await Category.findById(serviceData.category);
      if (!category) {
        throw new Error("Category not found");
      }
    }

    const service = new Service({
      ...serviceData,
      provider: provider._id,
    });

    await service.save();

    // Add service to provider's services array
    provider.services.push(service._id);
    await provider.save();

    return await this.getServiceById(service._id);
  }

  // Get service by ID
  async getServiceById(serviceId) {
    const service = await Service.findById(serviceId)
      .populate("provider", "profile rating")
      .populate("category", "name description");

    if (!service) {
      throw new Error("Service not found");
    }

    return service;
  }

  // Get all services
  async getAllServices(filters = {}) {
    const {
      page = 1,
      limit = 10,
      category,
      provider,
      search,
      minPrice,
      maxPrice,
      isActive,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = filters;

    let filter = {};

    if (category) {
      filter.category = category;
    }

    if (provider) {
      filter.provider = provider;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter["pricing.basePrice"] = {};
      if (minPrice !== undefined) {
        filter["pricing.basePrice"].$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        filter["pricing.basePrice"].$lte = maxPrice;
      }
    }

    let services = await Service.find(filter)
      .populate("provider", "profile rating")
      .populate("category", "name description")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Apply search filter
    if (search) {
      services = services.filter(
        (service) =>
          service.name.toLowerCase().includes(search.toLowerCase()) ||
          service.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = await Service.countDocuments(filter);

    return {
      services,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  // Get provider's services
  async getProviderServices(userId) {
    const provider = await Provider.findOne({ user: userId });
    if (!provider) {
      throw new Error("Provider profile not found");
    }

    const services = await Service.find({ provider: provider._id })
      .populate("category", "name description")
      .sort({ createdAt: -1 });

    return services;
  }

  // Update service
  async updateService(userId, serviceId, updateData) {
    const provider = await Provider.findOne({ user: userId });
    if (!provider) {
      throw new Error("Provider profile not found");
    }

    const service = await Service.findOne({
      _id: serviceId,
      provider: provider._id,
    });

    if (!service) {
      throw new Error("Service not found or access denied");
    }

    // Validate category if being updated
    if (updateData.category) {
      const category = await Category.findById(updateData.category);
      if (!category) {
        throw new Error("Category not found");
      }
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.provider;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const updatedService = await Service.findByIdAndUpdate(
      serviceId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("provider", "profile rating")
      .populate("category", "name description");

    return updatedService;
  }

  // Delete service
  async deleteService(userId, serviceId) {
    const provider = await Provider.findOne({ user: userId });
    if (!provider) {
      throw new Error("Provider profile not found");
    }

    const service = await Service.findOne({
      _id: serviceId,
      provider: provider._id,
    });

    if (!service) {
      throw new Error("Service not found or access denied");
    }

    // Remove service from provider's services array
    provider.services.pull(serviceId);
    await provider.save();

    // Delete the service
    await Service.findByIdAndDelete(serviceId);

    return { message: "Service deleted successfully" };
  }

  // Update service status
  async updateServiceStatus(userId, serviceId, isActive) {
    const provider = await Provider.findOne({ user: userId });
    if (!provider) {
      throw new Error("Provider profile not found");
    }

    const service = await Service.findOne({
      _id: serviceId,
      provider: provider._id,
    });

    if (!service) {
      throw new Error("Service not found or access denied");
    }

    const updatedService = await Service.findByIdAndUpdate(
      serviceId,
      { isActive },
      { new: true }
    )
      .populate("provider", "profile rating")
      .populate("category", "name description");

    return updatedService;
  }

  // Search services
  async searchServices(searchParams) {
    const {
      query,
      category,
      location,
      maxDistance = 10000,
      minPrice,
      maxPrice,
      minRating = 0,
      page = 1,
      limit = 10,
      sortBy = "relevance",
    } = searchParams;

    let filter = {
      isActive: true,
    };

    // Text search
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { tags: { $in: [new RegExp(query, "i")] } },
      ];
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter["pricing.basePrice"] = {};
      if (minPrice !== undefined) {
        filter["pricing.basePrice"].$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        filter["pricing.basePrice"].$lte = maxPrice;
      }
    }

    let services = await Service.find(filter)
      .populate({
        path: "provider",
        select: "profile rating location",
        match: {
          isActive: true,
          "verification.isVerified": true,
          ...(minRating > 0 && { "rating.average": { $gte: minRating } }),
        },
      })
      .populate("category", "name description")
      .sort(this.getSortOptions(sortBy))
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter out services where provider didn't match
    services = services.filter((service) => service.provider);

    // Location-based filtering if coordinates provided
    if (location && location.coordinates) {
      const nearbyProviders = await Provider.find({
        "location.coordinates": {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: location.coordinates,
            },
            $maxDistance: maxDistance,
          },
        },
        isActive: true,
        "verification.isVerified": true,
      }).select("_id");

      const providerIds = nearbyProviders.map((p) => p._id);
      services = services.filter((service) =>
        providerIds.some(
          (id) => id.toString() === service.provider._id.toString()
        )
      );
    }

    const total = services.length; // Approximate, as we filtered after query

    return {
      services,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  // Get sort options for search
  getSortOptions(sortBy) {
    switch (sortBy) {
      case "price_asc":
        return { "pricing.basePrice": 1 };
      case "price_desc":
        return { "pricing.basePrice": -1 };
      case "rating":
        return { "provider.rating.average": -1 };
      case "newest":
        return { createdAt: -1 };
      case "oldest":
        return { createdAt: 1 };
      case "name":
        return { name: 1 };
      default:
        return { createdAt: -1 }; // Default to newest
    }
  }

  // Get services by category
  async getServicesByCategory(categoryId, filters = {}) {
    const { page = 1, limit = 10 } = filters;

    const services = await Service.find({
      category: categoryId,
      isActive: true,
    })
      .populate("provider", "profile rating")
      .populate("category", "name description")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Service.countDocuments({
      category: categoryId,
      isActive: true,
    });

    return {
      services,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  // Get service statistics
  async getServiceStats() {
    const stats = {
      total: await Service.countDocuments(),
      active: await Service.countDocuments({ isActive: true }),
      inactive: await Service.countDocuments({ isActive: false }),
      byCategory: await Service.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        { $project: { categoryName: "$category.name", count: 1 } },
      ]),
      priceRange: await Service.aggregate([
        {
          $group: {
            _id: null,
            minPrice: { $min: "$pricing.basePrice" },
            maxPrice: { $max: "$pricing.basePrice" },
            avgPrice: { $avg: "$pricing.basePrice" },
          },
        },
      ]),
      today: await Service.countDocuments({
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
      }),
      thisWeek: await Service.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      thisMonth: await Service.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
    };

    return stats;
  }

  // Get featured services
  async getFeaturedServices(limit = 10) {
    const services = await Service.find({
      isActive: true,
      isFeatured: true,
    })
      .populate({
        path: "provider",
        select: "profile rating",
        match: {
          isActive: true,
          "verification.isVerified": true,
        },
      })
      .populate("category", "name description")
      .sort({ "provider.rating.average": -1, createdAt: -1 })
      .limit(limit);

    // Filter out services where provider didn't match
    return services.filter((service) => service.provider);
  }
}

export default new ServiceService();
