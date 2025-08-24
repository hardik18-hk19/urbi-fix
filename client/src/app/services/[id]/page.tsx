"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { servicesAPI } from "../../../lib/api";
import type { Service, User } from "../../../types";
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  DollarSign,
  Loader2,
  AlertCircle,
  Calendar,
  Users,
  CheckCircle,
  Phone,
  Mail,
} from "lucide-react";

export default function ServiceDetailsPage() {
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;

  const fetchService = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await servicesAPI.getServiceById(serviceId);
      setService(response.data);
    } catch (err: any) {
      console.error("Error fetching service:", err);
      setError(err.response?.data?.message || "Failed to load service details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (serviceId) {
      fetchService();
    }
  }, [serviceId]);

  const handleBookService = () => {
    router.push(`/consumer-dashboard/bookings?service=${serviceId}`);
  };

  const handleBackToServices = () => {
    router.push("/services");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600 dark:text-gray-300">
            Loading service details...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Service
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button
            variant="default"
            size="default"
            className=""
            onClick={handleBackToServices}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Services
          </Button>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Service Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The service you're looking for doesn't exist or has been removed.
          </p>
          <Button
            variant="default"
            size="default"
            className=""
            onClick={handleBackToServices}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Services
          </Button>
        </div>
      </div>
    );
  }

  const provider =
    typeof service.provider === "object" ? service.provider : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              className=""
              onClick={handleBackToServices}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Services
            </Button>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {service.name}
              </h1>
              <div className="flex items-center space-x-4 mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  {service.category}
                </span>
                {service.available && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Available
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">
                ${service.price}
              </div>
              <p className="text-sm text-gray-500">Base price</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card className="">
              <CardHeader className="">
                <CardTitle className="">Service Description</CardTitle>
              </CardHeader>
              <CardContent className="">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {service.description}
                </p>
              </CardContent>
            </Card>

            {/* Provider Information */}
            {provider && (
              <Card className="">
                <CardHeader className="">
                  <CardTitle className="">Service Provider</CardTitle>
                </CardHeader>
                <CardContent className="">
                  <div className="flex items-start space-x-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {provider.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 capitalize">
                        {provider.role}
                      </p>

                      {/* Contact Information */}
                      <div className="mt-4 space-y-2">
                        {provider.email && (
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Mail className="h-4 w-4 mr-2" />
                            {provider.email}
                          </div>
                        )}
                        {provider.phone && (
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Phone className="h-4 w-4 mr-2" />
                            {provider.phone}
                          </div>
                        )}
                      </div>

                      {/* Provider Stats */}
                      {provider.providerDetails && (
                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Rating</p>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-400 mr-1" />
                              <span className="font-medium">
                                {provider.providerDetails.rating}/5
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Completed Jobs
                            </p>
                            <p className="font-medium">
                              {provider.providerDetails.completedJobs}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Actions */}
            <Card className="">
              <CardHeader className="">
                <CardTitle className="">Book This Service</CardTitle>
                <CardDescription className="">
                  Ready to get started? Book this service now.
                </CardDescription>
              </CardHeader>
              <CardContent className="">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleBookService}
                  disabled={!service.available}
                  variant="default"
                >
                  {service.available ? (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Book Now
                    </>
                  ) : (
                    "Currently Unavailable"
                  )}
                </Button>

                <div className="mt-4 text-xs text-gray-500 text-center">
                  You'll be redirected to the booking page to select date and
                  time
                </div>
              </CardContent>
            </Card>

            {/* Service Details */}
            <Card className="">
              <CardHeader className="">
                <CardTitle className="">Service Details</CardTitle>
              </CardHeader>
              <CardContent className="">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Category
                    </span>
                    <span className="font-medium">{service.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Price
                    </span>
                    <span className="font-medium text-green-600">
                      ${service.price}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Status
                    </span>
                    <span
                      className={`font-medium ${
                        service.available ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {service.available ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  {service.createdAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Listed
                      </span>
                      <span className="font-medium">
                        {new Date(service.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
