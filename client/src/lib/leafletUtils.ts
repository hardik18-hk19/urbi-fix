// Leaflet utilities for custom icons and fixing SSR issues

// Enhanced icon fix for Leaflet
export const fixLeafletIcons = () => {
  if (typeof window === "undefined") return; // SSR guard

  try {
    const L = require("leaflet");
    // Remove the _getIconUrl method to prevent conflicts
    delete (L.Icon.Default.prototype as any)._getIconUrl;

    // Set up CDN URLs as fallback
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
  } catch (error) {
    console.warn("Leaflet icon fix failed:", error);
  }
};

// Create custom icons for markers to avoid Leaflet icon issues
export const createCustomIcon = (color: string = "#3388ff") => {
  if (typeof window === "undefined") {
    return {} as any;
  }

  try {
    const L = require("leaflet");
    return L.divIcon({
      className: "custom-div-icon",
      html: `<div style="
        background-color: ${color};
        width: 25px;
        height: 25px;
        border-radius: 50% 50% 50% 0;
        border: 3px solid white;
        transform: rotate(-45deg);
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [25, 25],
      iconAnchor: [12, 24],
    });
  } catch (error) {
    console.warn("Error creating custom icon:", error);
    return null;
  }
};

// Alternative simple marker icon
export const createSimpleIcon = (color: string = "#3388ff") => {
  if (typeof window === "undefined") {
    return {} as any;
  }

  try {
    const L = require("leaflet");
    return L.divIcon({
      className: "simple-marker-icon",
      html: `<div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  } catch (error) {
    console.warn("Error creating simple icon:", error);
    return null;
  }
};

// Service provider icon
export const createServiceIcon = (category: string = "general") => {
  if (typeof window === "undefined") {
    return {} as any;
  }

  try {
    const L = require("leaflet");
    const categoryColors = {
      plumbing: "#2563eb",
      electrical: "#dc2626",
      cleaning: "#16a34a",
      gardening: "#15803d",
      maintenance: "#9333ea",
      general: "#3388ff",
    };

    const color =
      categoryColors[category as keyof typeof categoryColors] ||
      categoryColors.general;

    return L.divIcon({
      className: "service-marker-icon",
      html: `<div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 4px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        color: white;
      ">S</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  } catch (error) {
    console.warn("Error creating service icon:", error);
    return null;
  }
};

// Issue marker icon
export const createIssueIcon = (
  status: string = "open",
  priority: string = "medium"
) => {
  if (typeof window === "undefined") {
    return {} as any;
  }

  try {
    const L = require("leaflet");
    const statusColors = {
      open: "#ef4444",
      in_progress: "#f59e0b",
      resolved: "#10b981",
      rejected: "#6b7280",
    };

    const color =
      statusColors[status as keyof typeof statusColors] || statusColors.open;

    return L.divIcon({
      className: "issue-marker-icon",
      html: `<div style="
        background-color: ${color};
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: white;
      ">!</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  } catch (error) {
    console.warn("Error creating issue icon:", error);
    return null;
  }
};

// Default icon for markers
export const defaultIcon = () => {
  try {
    return createSimpleIcon("#3388ff");
  } catch (error) {
    console.warn("Error creating default icon:", error);
    return null;
  }
};

// Initialize icon fix on import (for client-side only)
if (typeof window !== "undefined") {
  fixLeafletIcons();
}
