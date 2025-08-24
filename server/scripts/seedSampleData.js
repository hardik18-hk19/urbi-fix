import mongoose from "mongoose";
import Category from "../models/category.js";
import Service from "../models/serviceModel.js";
import User from "../models/userModel.js";
import { config } from "dotenv";

config();

// Sample categories
const sampleCategories = [
  {
    name: "Plumbing",
    description: "Water pipes, fixtures, and drainage systems",
    icon: "wrench",
  },
  {
    name: "Electrical",
    description: "Electrical installations, repairs, and maintenance",
    icon: "zap",
  },
  {
    name: "Carpentry",
    description: "Wood work, furniture, and construction",
    icon: "hammer",
  },
  {
    name: "Cleaning",
    description: "House cleaning and maintenance services",
    icon: "sparkles",
  },
  {
    name: "Gardening",
    description: "Landscaping and garden maintenance",
    icon: "leaf",
  },
  {
    name: "Painting",
    description: "Interior and exterior painting services",
    icon: "palette",
  },
];

async function seedData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Find an admin user or create a default one
    let adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      adminUser = new User({
        name: "System Admin",
        email: "admin@urbfix.com",
        password: "password123", // This should be hashed in production
        role: "admin",
      });
      await adminUser.save();
      console.log("Created admin user");
    }

    // Clear existing categories
    await Category.deleteMany({});
    console.log("Cleared existing categories");

    // Create categories
    for (const categoryData of sampleCategories) {
      const category = new Category({
        ...categoryData,
        createdBy: adminUser._id,
      });
      await category.save();
      console.log(`Created category: ${category.name}`);
    }

    // Find a provider user for sample services
    let providerUser = await User.findOne({ role: "provider" });
    if (!providerUser) {
      providerUser = new User({
        name: "John Provider",
        email: "provider@urbfix.com",
        password: "password123", // This should be hashed in production
        role: "provider",
        providerDetails: {
          category: "Plumbing",
          verified: true,
          rating: 4.5,
          completedJobs: 25,
          description: "Experienced plumber with 10+ years in the field",
          services: ["Emergency repairs", "Installation", "Maintenance"],
        },
      });
      await providerUser.save();
      console.log("Created provider user");
    }

    // Clear existing services
    await Service.deleteMany({});
    console.log("Cleared existing services");

    // Create sample services
    const sampleServices = [
      {
        name: "Emergency Plumbing Repair",
        description:
          "24/7 emergency plumbing services for urgent repairs including pipe bursts, toilet clogs, and water leaks.",
        category: "Plumbing",
        provider: providerUser._id,
        price: 150,
        available: true,
      },
      {
        name: "Kitchen Faucet Installation",
        description:
          "Professional installation of kitchen faucets with warranty. Includes removal of old faucet and cleanup.",
        category: "Plumbing",
        provider: providerUser._id,
        price: 85,
        available: true,
      },
      {
        name: "Electrical Outlet Installation",
        description:
          "Safe installation of new electrical outlets in your home. Licensed electrician service.",
        category: "Electrical",
        provider: providerUser._id,
        price: 120,
        available: true,
      },
      {
        name: "Custom Bookshelf Construction",
        description:
          "Handcrafted wooden bookshelves built to your specifications. Quality materials and craftsmanship.",
        category: "Carpentry",
        provider: providerUser._id,
        price: 300,
        available: true,
      },
      {
        name: "Deep House Cleaning",
        description:
          "Comprehensive house cleaning service including all rooms, bathrooms, and kitchen. Eco-friendly products.",
        category: "Cleaning",
        provider: providerUser._id,
        price: 180,
        available: true,
      },
    ];

    for (const serviceData of sampleServices) {
      const service = new Service(serviceData);
      await service.save();
      console.log(`Created service: ${service.name}`);
    }

    console.log("Sample data seeded successfully!");
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the seeder
seedData();
