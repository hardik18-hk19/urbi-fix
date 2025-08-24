"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Search,
  MapPin,
  List,
  Star,
  DollarSign,
  Loader2,
  Users,
} from "lucide-react";
import ServicesMap from "../map/ServicesMap";
import BookingModal from "../booking/BookingModal";
import { servicesAPI, categoriesAPI } from "../../lib/api";
import type { Service, User } from "../../types";

const ServicesWithMap: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [bookingModal, setBookingModal] = useState<{
    isOpen: boolean;
    service: Service | null;
  }>({
    isOpen: false,
    service: null,
  });

  useEffect(() => {
    fetchServices();
    fetchCategories();
    getUserLocation();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await servicesAPI.getServices({
        category: selectedCategory,
        available: availableOnly,
      });
      setServices(response.data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
      setError("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchServices();
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, selectedCategory, availableOnly]);

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || service.category === selectedCategory;
    const matchesAvailability = !availableOnly || service.available;

    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const handleServiceSelect = (service: Service) => {
    setBookingModal({ isOpen: true, service });
  };

  const ServiceCard: React.FC<{ service: Service }> = ({ service }) => {
    const provider =
      typeof service.provider === "object" ? (service.provider as User) : null;

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{service.name}</CardTitle>
              <p className="text-sm text-blue-600 font-medium mt-1">
                {service.category}
              </p>
            </div>
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                service.available
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {service.available ? "Available" : "Unavailable"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="">
          <p className="text-gray-600 mb-4">{service.description}</p>

          {provider && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{provider.name}</p>
                  {provider.providerDetails && (
                    <div className="flex items-center mt-1">
                      <Star className="w-3 h-3 text-yellow-400 mr-1" />
                      <span className="text-xs text-gray-600">
                        {provider.providerDetails.rating}/5 (
                        {provider.providerDetails.completedJobs} jobs)
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="flex items-center text-green-600">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-semibold">${service.price}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              variant="default"
              size="sm"
              className=""
              onClick={() => handleServiceSelect(service)}
            >
              Book Service
            </Button>
            <Button variant="outline" size="sm" className="">
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading services...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Available Services
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Find and book services from verified providers in your area
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                className="pl-10"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="available-only"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="available-only" className="text-sm">
                Available only
              </label>
            </div>

            <div className="flex space-x-2">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                className="flex items-center space-x-1"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
                <span>List</span>
              </Button>
              <Button
                variant={viewMode === "map" ? "default" : "outline"}
                size="sm"
                className="flex items-center space-x-1"
                onClick={() => setViewMode("map")}
              >
                <MapPin className="w-4 h-4" />
                <span>Map</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {viewMode === "list" ? (
        filteredServices.length === 0 ? (
          <Card className="">
            <CardContent className="pt-6 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No services found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search criteria or browse all categories
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <ServiceCard key={service._id || service.id} service={service} />
            ))}
          </div>
        )
      ) : (
        <ServicesMap
          services={filteredServices}
          onServiceSelect={handleServiceSelect}
          userLocation={userLocation || undefined}
          height="600px"
        />
      )}

      {/* Booking Modal */}
      {bookingModal.isOpen && bookingModal.service && (
        <BookingModal
          isOpen={bookingModal.isOpen}
          onClose={() => setBookingModal({ isOpen: false, service: null })}
          service={bookingModal.service}
          onBookingSuccess={() => {
            setBookingModal({ isOpen: false, service: null });
            // Optionally refresh services
          }}
        />
      )}
    </div>
  );
};

export default ServicesWithMap;
