import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { defaultIcon, fixLeafletIcons } from "../../lib/leafletUtils";

interface MapComponentProps {
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

const MapClickHandler = ({ onClick }: { onClick?: (e: any) => void }) => {
  const map = useMapEvents({
    click: (e) => {
      try {
        if (onClick && typeof onClick === "function") {
          onClick(e);
        }
      } catch (error) {
        console.warn("Map click handler error:", error);
      }
    },
  });

  useEffect(() => {
    // Cleanup function to remove event listeners
    return () => {
      try {
        if (map && map.off) {
          map.off("click");
        }
      } catch (error) {
        console.warn("Map click handler cleanup warning:", error);
      }
    };
  }, [map]);

  return null;
};

const MapComponent: React.FC<MapComponentProps> = ({
  center,
  zoom = 13,
  height = "400px",
  markers = [],
  circles = [],
  onClick,
  className = "",
}) => {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Fix Leaflet icons when component mounts
    fixLeafletIcons();
    setMapReady(true);
  }, []);

  // Use center coordinates as key to force re-render when center changes significantly
  const mapKey = `${center[0].toFixed(3)}-${center[1].toFixed(3)}`;

  if (!mapReady) {
    return (
      <div
        style={{ height }}
        className={`${className} bg-gray-200 flex items-center justify-center`}
      >
        <span className="text-gray-500">Loading map...</span>
      </div>
    );
  }

  return (
    <div style={{ height }} className={className}>
      <MapContainer
        key={mapKey}
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        attributionControl={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {onClick && <MapClickHandler onClick={onClick} />}

        {markers
          .filter((marker) => marker && marker.position)
          .map((marker) => {
            try {
              const iconToUse = marker.icon || defaultIcon();
              // Skip rendering if icon creation failed
              if (!iconToUse) {
                console.warn(
                  `Skipping marker ${marker.id} due to icon creation failure`
                );
                return null;
              }
              return (
                <Marker
                  key={marker.id}
                  position={marker.position}
                  icon={iconToUse}
                >
                  {marker.popup && <Popup>{marker.popup}</Popup>}
                </Marker>
              );
            } catch (error) {
              console.warn(`Error rendering marker ${marker.id}:`, error);
              return null;
            }
          })}

        {circles
          .filter((circle) => circle && circle.center)
          .map((circle, index) => {
            try {
              return (
                <Circle
                  key={`circle-${index}`}
                  center={circle.center}
                  radius={circle.radius}
                  color={circle.color || "#3388ff"}
                  fillColor={circle.fillColor || "#3388ff"}
                  fillOpacity={circle.fillOpacity || 0.2}
                />
              );
            } catch (error) {
              console.warn(`Error rendering circle ${index}:`, error);
              return null;
            }
          })}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
