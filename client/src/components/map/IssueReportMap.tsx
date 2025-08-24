"use client";

import React, { useState, useEffect } from "react";
import { MapPin, Camera, Send, Loader2, X } from "lucide-react";
import Map from "./Map";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { issuesAPI, categoriesAPI } from "../../lib/api";
import { createSimpleIcon } from "../../lib/leafletUtils";

// Default categories as fallback
const defaultCategories = [
  { _id: "pothole", name: "Pothole", description: "Road potholes and damages" },
  { _id: "garbage", name: "Garbage", description: "Garbage collection issues" },
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
  { _id: "plumbing", name: "Plumbing", description: "Plumbing issues" },
  { _id: "other", name: "Other", description: "Other civic issues" },
];

interface IssueReportMapProps {
  onIssueSubmitted?: (issue: any) => void;
  initialLocation?: [number, number];
}

const IssueReportMap: React.FC<IssueReportMapProps> = ({
  onIssueSubmitted,
  initialLocation,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<
    [number, number] | null
  >(initialLocation || null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    images: [] as File[],
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    initialLocation || [12.9716, 77.5946] // Default to Bangalore
  );

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoriesAPI.getCategories();
        if (response.data && Array.isArray(response.data)) {
          setCategories(response.data);
        } else {
          setCategories(defaultCategories);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories(defaultCategories);
      }
    };

    fetchCategories();
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location: [number, number] = [latitude, longitude];
        setSelectedLocation(location);
        setMapCenter(location);
        setGettingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert(
          "Unable to get your location. Please click on the map to select a location."
        );
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      }
    );
  };

  const handleMapClick = (e: any) => {
    const { lat, lng } = e.latlng;
    setSelectedLocation([lat, lng]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...newFiles].slice(0, 5), // Max 5 images
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLocation) {
      alert("Please select a location on the map or use current location.");
      return;
    }

    if (!formData.title || !formData.description || !formData.category) {
      alert("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append("title", formData.title);
      submitData.append("description", formData.description);
      submitData.append("category", formData.category);
      submitData.append(
        "location[coordinates][latitude]",
        selectedLocation[0].toString()
      );
      submitData.append(
        "location[coordinates][longitude]",
        selectedLocation[1].toString()
      );

      // Add images
      formData.images.forEach((image, index) => {
        submitData.append(`images`, image);
      });

      // Note: You'll need to implement the proper API endpoint for form data
      const response = await issuesAPI.createIssue({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        location: {
          address: `${selectedLocation[0].toFixed(
            6
          )}, ${selectedLocation[1].toFixed(6)}`,
          coordinates: {
            latitude: selectedLocation[0],
            longitude: selectedLocation[1],
          },
        },
        images: [],
      });

      if (onIssueSubmitted) {
        onIssueSubmitted(response.data);
      }

      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "",
        images: [],
      });
      setSelectedLocation(null);

      alert("Issue reported successfully!");
    } catch (error) {
      console.error("Error submitting issue:", error);
      alert("Failed to submit issue. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Create marker for selected location
  const markers = selectedLocation
    ? [
        {
          id: "selected-location",
          position: selectedLocation,
          icon: createSimpleIcon("#dc2626"),
          popup: (
            <div className="p-2">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Issue Location
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {selectedLocation[0].toFixed(6)},{" "}
                {selectedLocation[1].toFixed(6)}
              </p>
            </div>
          ),
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Card className="">
        <CardHeader className="">
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Report Issue with Location</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Select Location
            </label>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="flex items-center space-x-2"
              >
                {gettingLocation ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
                <span>Use Current Location</span>
              </Button>
              <span className="text-sm text-gray-500 dark:text-gray-400 self-center">
                or click on the map below
              </span>
            </div>
          </div>

          {/* Map */}
          <div className="border rounded-lg overflow-hidden">
            <Map
              center={mapCenter}
              zoom={15}
              height="300px"
              markers={markers}
              onClick={handleMapClick}
            />
          </div>

          {selectedLocation && (
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-green-50 dark:bg-green-900 p-2 rounded">
              📍 Location selected: {selectedLocation[0].toFixed(6)},{" "}
              {selectedLocation[1].toFixed(6)}
            </div>
          )}

          {/* Issue Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Issue Title *
              </label>
              <Input
                type="text"
                className=""
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Brief title for the issue"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, category: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option
                    key={category._id || category}
                    value={category._id || category}
                  >
                    {category.name ||
                      category
                        .replace("_", " ")
                        .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Description *
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Detailed description of the issue"
                rows={4}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Photos (Optional - Max 5)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-800"
              />
              {formData.images.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-20 object-cover rounded border border-gray-300 dark:border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="default"
              size="default"
              disabled={loading || !selectedLocation}
              className="w-full flex items-center justify-center space-x-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{loading ? "Submitting..." : "Report Issue"}</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default IssueReportMap;
