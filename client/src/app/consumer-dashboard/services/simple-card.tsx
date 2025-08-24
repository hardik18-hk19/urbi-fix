"use client";

import { Button } from "../../../components/ui/button";
import {
  Calendar,
  BookOpen,
  Users,
  DollarSign,
  CheckCircle,
} from "lucide-react";

export default function SimpleServiceCard({
  service,
  onViewDetails,
  onBookService,
}) {
  return (
    <div
      className="rounded-lg border cursor-pointer hover:shadow-lg transition-shadow"
      style={{
        backgroundColor: "white",
        borderColor: "#e5e7eb",
        padding: "1.5rem",
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
        color: "#1f2937",
      }}
      onClick={() => onViewDetails(service.id || service._id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3
            className="text-lg font-semibold mb-1"
            style={{ color: "#1f2937" }}
          >
            {service.name}
          </h3>
          <p className="text-sm font-medium" style={{ color: "#2563eb" }}>
            {service.category}
          </p>
        </div>
        {service.available && (
          <CheckCircle className="h-5 w-5" style={{ color: "#10b981" }} />
        )}
      </div>

      {/* Description */}
      <p
        className="mb-4 text-sm"
        style={{ color: "#4b5563", lineHeight: "1.4" }}
      >
        {service.description}
      </p>

      {/* Provider Info */}
      {service.provider && typeof service.provider === "object" && (
        <div className="flex items-center mb-3">
          <Users className="h-4 w-4 mr-2" style={{ color: "#9ca3af" }} />
          <span className="text-sm" style={{ color: "#4b5563" }}>
            {service.provider.name}
          </span>
        </div>
      )}

      {/* Price */}
      <div className="flex items-center mb-4">
        <DollarSign className="h-4 w-4 mr-2" style={{ color: "#9ca3af" }} />
        <span className="text-lg font-semibold" style={{ color: "#059669" }}>
          ${service.price}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(service.id || service._id);
          }}
        >
          <BookOpen className="h-3 w-3 mr-1" />
          Details
        </Button>
        <Button
          variant="default"
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onBookService(service.id || service._id);
          }}
          disabled={!service.available}
        >
          <Calendar className="h-3 w-3 mr-1" />
          Book Now
        </Button>
      </div>
    </div>
  );
}
