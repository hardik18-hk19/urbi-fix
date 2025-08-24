"use client";

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import MapErrorBoundary from "./MapErrorBoundary";

interface MapProps {
  center: [number, number];
  zoom?: number;
  height?: string;
  markers?: Array<{
    id: string;
    position: [number, number];
    popup?: React.ReactNode;
    icon?: any;
  }>;
  circles?: Array<{
    center: [number, number];
    radius: number;
    color?: string;
    fillColor?: string;
    fillOpacity?: number;
  }>;
  onClick?: (e: any) => void;
  className?: string;
}

// Create a component that will be dynamically loaded
const DynamicMap = dynamic(() => import("./MapComponent"), {
  loading: () => (
    <div className="bg-gray-200 flex items-center justify-center h-96">
      <span className="text-gray-500">Loading map...</span>
    </div>
  ),
  ssr: false,
});

const Map: React.FC<MapProps> = (props) => {
  useEffect(() => {
    // Add Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.7.1/dist/leaflet.css";
    link.integrity =
      "sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A==";
    link.crossOrigin = "";
    document.head.appendChild(link);

    return () => {
      // Cleanup
      const existingLink = document.querySelector(
        'link[href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"]'
      );
      if (existingLink) {
        document.head.removeChild(existingLink);
      }
    };
  }, []);

  return (
    <MapErrorBoundary>
      <DynamicMap {...props} />
    </MapErrorBoundary>
  );
};

export default Map;
