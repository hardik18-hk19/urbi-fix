"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { servicesAPI, categoriesAPI } from "../../lib/api";
import type { Service } from "../../types";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function ProviderServicesManagement() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
  });

  const fetchProviderServices = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await servicesAPI.getProviderServices();
      setServices(response.data || []);
    } catch (err: any) {
      console.error("Error fetching provider services:", err);
      setError(err.response?.data?.message || "Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProviderServices();
  }, []);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const serviceData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
      };

      await servicesAPI.createService(serviceData);

      // Reset form and refresh services
      setFormData({ name: "", description: "", category: "", price: "" });
      setShowCreateForm(false);
      fetchProviderServices();
    } catch (err: any) {
      console.error("Error creating service:", err);
      setError(err.response?.data?.message || "Failed to create service");
    }
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
      };

      await servicesAPI.updateService(
        editingService.id || editingService._id!,
        updateData
      );

      // Reset form and refresh services
      setFormData({ name: "", description: "", category: "", price: "" });
      setEditingService(null);
      fetchProviderServices();
    } catch (err: any) {
      console.error("Error updating service:", err);
      setError(err.response?.data?.message || "Failed to update service");
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      await servicesAPI.deleteService(serviceId);
      fetchProviderServices();
    } catch (err: any) {
      console.error("Error deleting service:", err);
      setError(err.response?.data?.message || "Failed to delete service");
    }
  };

  const handleEditClick = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description,
      category: service.category,
      price: service.price.toString(),
    });
    setShowCreateForm(true);
  };

  const handleCancelEdit = () => {
    setEditingService(null);
    setFormData({ name: "", description: "", category: "", price: "" });
    setShowCreateForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600 dark:text-gray-300">
            Loading services...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Services
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your service offerings
          </p>
        </div>
        <Button
          variant="default"
          size="default"
          className=""
          onClick={() => setShowCreateForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card className="">
          <CardHeader className="">
            <CardTitle className="">
              {editingService ? "Edit Service" : "Create New Service"}
            </CardTitle>
            <CardDescription className="">
              {editingService
                ? "Update your service details"
                : "Add a new service to your offerings"}
            </CardDescription>
          </CardHeader>
          <CardContent className="">
            <form
              onSubmit={
                editingService ? handleUpdateService : handleCreateService
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Service Name
                  </label>
                  <Input
                    type="text"
                    className=""
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option
                        key={category._id || category.name}
                        value={category.name}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price ($)
                  </label>
                  <Input
                    type="number"
                    className=""
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                  required
                />
              </div>
              <div className="flex space-x-2 mt-6">
                <Button
                  type="submit"
                  variant="default"
                  size="default"
                  className=""
                >
                  {editingService ? "Update Service" : "Create Service"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className=""
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Services List */}
      {services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id || service._id} className="">
              <CardHeader className="">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      {service.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-blue-600 font-medium">
                      {service.category}
                    </CardDescription>
                  </div>
                  <div className="flex items-center">
                    {service.available ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="">
                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                  {service.description}
                </p>

                {/* Price */}
                <div className="flex items-center mb-4">
                  <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-lg font-semibold text-green-600">
                    ${service.price}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditClick(service)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 hover:text-red-700"
                    onClick={() =>
                      handleDeleteService(service.id || service._id!)
                    }
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="">
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No services yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first service to start accepting bookings.
            </p>
            <Button
              variant="default"
              size="default"
              className=""
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Service
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
