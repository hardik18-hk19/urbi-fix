"use client";

import React, { useState, useEffect } from "react";
import { MapPin, Star, Clock, DollarSign } from "lucide-react";
import Map from "./Map";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { servicesAPI } from "../../lib/api";
import { createServiceIcon, createSimpleIcon } from "../../lib/leafletUtils";
import type { Service, Provider } from "../../types";

interface ServicesMapProps {
  services?: Service[];
  onServiceSelect?: (service: Service) => void;
  userLocation?: [number, number];
  height?: string;
}

const ServicesMap: React.FC<ServicesMapProps> = ({
  services = [],
  onServiceSelect,
  userLocation,
  height = "500px",
}) => {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    userLocation || [12.9716, 77.5946] // Default to Bangalore
  );

  // Create markers for services
  const markers = services
    .filter((service) => {
      // Check if provider is populated and has serviceArea
      if (typeof service.provider === "object" && service.provider !== null) {
        const provider = service.provider as Provider;
        return provider.serviceArea?.center;
      }
      return false;
    })
    .map((service) => {
      const provider = service.provider as Provider;
      return {
        id: service._id || service.id || "",
        position: [
          provider.serviceArea!.center.latitude,
          provider.serviceArea!.center.longitude,
        ] as [number, number],
        icon: createServiceIcon(service.category),
        popup: (
          <Card className="w-64">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {service.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <p className="text-xs text-gray-600 line-clamp-2">
                  {service.description}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span>{provider.rating?.average?.toFixed(1) || "New"}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <DollarSign className="w-3 h-3 text-green-600" />
                    <span>
                      $
                      {service.pricing?.basePrice ||
                        service.pricing?.hourlyRate ||
                        service.price}
                      /hr
                    </span>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={() => onServiceSelect?.(service)}
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ),
      };
    });

  // Create circles for service areas
  const circles = services
    .filter((service) => {
      if (typeof service.provider === "object" && service.provider !== null) {
        const provider = service.provider as Provider;
        return provider.serviceArea?.center;
      }
      return false;
    })
    .map((service) => {
      const provider = service.provider as Provider;
      return {
        center: [
          provider.serviceArea!.center.latitude,
          provider.serviceArea!.center.longitude,
        ] as [number, number],
        radius: (provider.serviceArea!.radius || 10) * 1000, // Convert km to meters
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.1,
      };
    });

  // Add user location marker if available
  if (userLocation) {
    markers.push({
      id: "user-location",
      position: userLocation,
      icon: createSimpleIcon("#1d4ed8"),
      popup: (
        <div className="p-2">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">Your Location</span>
          </div>
        </div>
      ),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Services Near You</h3>
        <div className="text-sm text-gray-600">
          {services.length} services found
        </div>
      </div>

      <Map
        center={mapCenter}
        zoom={12}
        height={height}
        markers={markers}
        circles={circles}
        className="rounded-lg border"
      />

      {services.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No services found in this area</p>
          <p className="text-sm">Try expanding your search radius</p>
        </div>
      )}
    </div>
  );
};

export default ServicesMap;
