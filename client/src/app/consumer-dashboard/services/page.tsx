"use client";

import { ProtectedRoute } from "../../../components/ProtectedRoute";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { servicesAPI, categoriesAPI } from "../../../lib/api";
import type { Service, User } from "../../../types";
import SimpleServiceCard from "./simple-card";
import {
  Search,
  Filter,
  Star,
  MapPin,
  Clock,
  DollarSign,
  Loader2,
  AlertCircle,
  Calendar,
  Users,
  CheckCircle,
  Heart,
  BookOpen,
} from "lucide-react";

export default function ConsumerServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [availableOnly, setAvailableOnly] = useState(true);
  const router = useRouter();

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (selectedCategory) params.category = selectedCategory;
      if (availableOnly) params.available = true;

      const servicesResponse = await servicesAPI.getServices(params);
      setServices(servicesResponse.data || []);
    } catch (err: any) {
      console.error("Error fetching services:", err);
      setError(err.response?.data?.message || "Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const categoriesResponse = await categoriesAPI.getCategories();
      setCategories(categoriesResponse.data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchServices();
  }, [selectedCategory, availableOnly]);

  const filteredServices = services.filter(
    (service) =>
      service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleServiceClick = (serviceId: string) => {
    router.push(`/services/${serviceId}`);
  };

  const handleBookService = (serviceId: string) => {
    router.push(`/consumer-dashboard/bookings?service=${serviceId}`);
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="consumer" fallbackPath="/login">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-600 dark:text-gray-300">
              Loading services...
            </span>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="consumer" fallbackPath="/login">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Browse Services
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Find and book professional services from verified providers
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  className="pl-10"
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option
                    key={category._id || category.name}
                    value={category.name}
                  >
                    {category.name}
                  </option>
                ))}
              </select>

              {/* Availability Filter */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="available"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Available only
                </label>
              </div>

              {/* Results Count */}
              <div className="flex items-center justify-end">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredServices.length} services found
                </span>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}

          {/* Services Grid */}
          {filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <SimpleServiceCard
                  key={service.id || service._id}
                  service={service}
                  onViewDetails={handleServiceClick}
                  onBookService={handleBookService}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No services found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search criteria or check back later for new
                services.
              </p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
