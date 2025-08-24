"use client";

import React, { useState, useEffect } from "react";
import { issuesAPI, categoriesAPI } from "../../lib/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { useUserStore } from "../../store/userStore";

const ReportIssue = ({ onIssueCreated }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium",
    images: [],
    estimatedCost: "",
  });
  const [location, setLocation] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { user } = useUserStore();

  // Pre-defined categories if API doesn't work
  const defaultCategories = [
    {
      _id: "pothole",
      name: "Pothole",
      description: "Road potholes and damages",
    },
    {
      _id: "garbage",
      name: "Garbage",
      description: "Garbage collection issues",
    },
    {
      _id: "streetlight",
      name: "Street Light",
      description: "Street lighting problems",
    },
    {
      _id: "water_supply",
      name: "Water Supply",
      description: "Water supply issues",
    },
    {
      _id: "drainage",
      name: "Drainage",
      description: "Drainage and sewage problems",
    },
    { _id: "electrical", name: "Electrical", description: "Electrical issues" },
    { _id: "other", name: "Other", description: "Other civic issues" },
  ];

  useEffect(() => {
    fetchCategories();
    getCurrentLocation();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data || defaultCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories(defaultCategories);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Try to get address from coordinates using reverse geocoding
          const address = await reverseGeocode(latitude, longitude);
          setLocation({
            coordinates: { latitude, longitude },
            address:
              address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          });
        } catch (error) {
          setLocation({
            coordinates: { latitude, longitude },
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          });
        }
        setGettingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        setError("Unable to get your location. Please enter address manually.");
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      }
    );
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      // Using a free geocoding service (you might want to use a proper API key for production)
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=YOUR_API_KEY`
      );
      const data = await response.json();
      if (data.results && data.results[0]) {
        return data.results[0].formatted;
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
    }
    return null;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(files);

    // Create preview URLs
    const imageUrls = files.map((file) => URL.createObjectURL(file));
    setFormData((prev) => ({
      ...prev,
      images: imageUrls,
    }));
  };

  const handleAddressChange = (e) => {
    const address = e.target.value;
    setLocation((prev) => ({
      ...prev,
      address,
    }));
  };

  const uploadImages = async (files) => {
    // This is a placeholder for image upload functionality
    // In a real application, you would upload to a cloud service like AWS S3, Cloudinary, etc.
    const uploadedUrls = [];

    for (const file of files) {
      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // For now, we'll use the object URL as a placeholder
      // In production, replace this with actual upload logic
      uploadedUrls.push(URL.createObjectURL(file));
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.category) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!location) {
      setError(
        "Location is required. Please allow location access or enter address manually."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Upload images if any
      let imageUrls = [];
      if (imageFiles.length > 0) {
        imageUrls = await uploadImages(imageFiles);
      }

      const issueData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        location: {
          address: location.address,
          coordinates: location.coordinates || { latitude: 0, longitude: 0 },
        },
        priority: formData.priority,
        images: imageUrls,
        estimatedCost: formData.estimatedCost
          ? parseFloat(formData.estimatedCost)
          : undefined,
      };

      const response = await issuesAPI.createIssue(issueData);

      if (response.success) {
        setSuccess("Issue reported successfully!");

        // Reset form
        setFormData({
          title: "",
          description: "",
          category: "",
          priority: "medium",
          images: [],
          estimatedCost: "",
        });
        setImageFiles([]);

        // Call parent callback if provided
        if (onIssueCreated) {
          onIssueCreated(response.data);
        }
      }
    } catch (error) {
      console.error("Error creating issue:", error);
      setError(
        error.response?.data?.message ||
          "Failed to report issue. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== "consumer") {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-600">
          Please log in as a consumer to report issues.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Report an Issue</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Issue Title *
          </label>
          <Input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Brief description of the issue"
            required
            className="w-full"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Detailed description of the issue"
            required
            rows={4}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Category *
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            required
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name} - {category.description}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label
            htmlFor="priority"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Location *
          </label>
          <div className="space-y-2">
            <Button
              type="button"
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              variant="outline"
              className="w-full"
            >
              {gettingLocation
                ? "Getting Location..."
                : "📍 Use Current Location"}
            </Button>
            <Input
              type="text"
              placeholder="Or enter address manually"
              value={location?.address || ""}
              onChange={handleAddressChange}
              className="w-full"
            />
            {location?.coordinates && (
              <p className="text-sm text-gray-500">
                Coordinates: {location.coordinates.latitude.toFixed(6)},{" "}
                {location.coordinates.longitude.toFixed(6)}
              </p>
            )}
          </div>
        </div>

        {/* Images */}
        <div>
          <label
            htmlFor="images"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Images (Optional)
          </label>
          <input
            type="file"
            id="images"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-800 dark:file:text-gray-300"
          />
          <p className="text-sm text-gray-500 mt-1">
            Upload photos to help illustrate the issue
          </p>

          {/* Image previews */}
          {formData.images.length > 0 && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              {formData.images.map((imageUrl, index) => (
                <div key={index} className="relative">
                  <img
                    src={imageUrl}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md border"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estimated Cost */}
        <div>
          <label
            htmlFor="estimatedCost"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Estimated Cost (Optional)
          </label>
          <Input
            type="number"
            id="estimatedCost"
            name="estimatedCost"
            value={formData.estimatedCost}
            onChange={handleInputChange}
            placeholder="Estimated cost to fix (in ₹)"
            min="0"
            step="0.01"
            className="w-full"
          />
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
            {success}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading || !location}
          className="w-full"
        >
          {loading ? "Reporting Issue..." : "Report Issue"}
        </Button>
      </form>
    </Card>
  );
};

export default ReportIssue;
