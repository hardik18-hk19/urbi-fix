import Service from "../models/serviceModel.js";

export const getAllServices = async (req, res) => {
  try {
    const { category, provider, available } = req.query;
    let filter = {};

    if (category) filter.category = category;
    if (provider) {
      // Handle special case where provider is "current"
      if (provider === "current") {
        // This requires authentication, check if user is authenticated
        if (!req.user || !req.user.id) {
          return res
            .status(401)
            .json({
              message: "Authentication required for current provider services",
            });
        }
        filter.provider = req.user.id;
      } else {
        filter.provider = provider;
      }
    }
    if (available !== undefined) filter.available = available === "true";

    const services = await Service.find(filter)
      .populate("provider", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: services,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate(
      "provider",
      "name email"
    );

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const createService = async (req, res) => {
  try {
    const { name, description, category, price } = req.body;

    const service = new Service({
      name,
      description,
      category,
      price,
      provider: req.user.id,
    });

    await service.save();

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: service,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Check permissions
    if (
      req.user.role === "provider" &&
      service.provider.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: updatedService,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Check permissions
    if (
      req.user.role === "provider" &&
      service.provider.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Service.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
