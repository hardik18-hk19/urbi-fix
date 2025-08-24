"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  MapPin,
  List,
  Plus,
  Navigation,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Service, Issue, IssueStatus, IssuePriority } from "../../types";
import { issuesAPI } from "../../lib/api";
import { useUserStore } from "../../store/userStore";
import Map from "../../components/map/Map";
import ServicesMap from "../../components/map/ServicesMap";
import IssuesMap from "../../components/map/IssuesMap";
import IssueReportMap from "../../components/map/IssueReportMap";

const MapDemoContent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUserStore();
  const mode = searchParams.get("mode");

  const [activeDemo, setActiveDemo] = useState<
    "basic" | "services" | "issues" | "report"
  >(mode === "report" ? "report" : "basic");
  const [userLocation, setUserLocation] = useState<[number, number]>([
    12.9716, 77.5946,
  ]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [manualLocation, setManualLocation] = useState({ lat: "", lng: "" });
  const [showManualInput, setShowManualInput] = useState(false);

  // Real issues state
  const [realIssues, setRealIssues] = useState<Issue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState<string>("");

  // Effect to handle mode changes from URL
  useEffect(() => {
    if (mode === "report") {
      setActiveDemo("report");
    }
  }, [mode]);

  // Fetch real issues from API
  const fetchRealIssues = useCallback(async () => {
    if (!user) {
      setIssuesError("Please log in to view issues");
      return;
    }

    setIssuesLoading(true);
    setIssuesError("");

    try {
      const response = await issuesAPI.getIssues({
        page: 1,
        limit: 100, // Get more issues for the map
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (response.success) {
        setRealIssues(response.data);
      } else {
        setIssuesError("Failed to fetch issues");
      }
    } catch (error: any) {
      console.error("Error fetching issues:", error);
      setIssuesError(error.response?.data?.message || "Failed to fetch issues");
    } finally {
      setIssuesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeDemo === "issues" && user) {
      fetchRealIssues();
    }
  }, [activeDemo, user, fetchRealIssues]);

  const handleIssueSelect = (issue: Issue) => {
    router.push(`/forum/issue/${issue._id || issue.id}`);
  };

  const handleBackToIssues = () => {
    router.push("/consumer-dashboard/issues");
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    setLocationLoading(true);

    const options = {
      enableHighAccuracy: true, // Use GPS if available
      timeout: 10000, // 10 seconds timeout
      maximumAge: 0, // Don't use cached location
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log("Location obtained:", { latitude, longitude, accuracy });
        setUserLocation([latitude, longitude]);
        setLocationAccuracy(accuracy);
        setLocationLoading(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        let errorMessage = "Unable to get your location. ";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage +=
              "Location permission denied. Please enable location access and try again.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out. Please try again.";
            break;
          default:
            errorMessage += "An unknown error occurred.";
            break;
        }

        alert(errorMessage);
        setLocationLoading(false);
      },
      options
    );
  };

  // Function to get high-accuracy location
  const getHighAccuracyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    setLocationLoading(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 15000, // Longer timeout for high accuracy
      maximumAge: 0,
    };

    // Try to get the best possible location
    navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log("High-accuracy location:", {
          latitude,
          longitude,
          accuracy,
        });

        // Only update if we get better accuracy or this is the first reading
        if (!locationAccuracy || accuracy < locationAccuracy) {
          setUserLocation([latitude, longitude]);
          setLocationAccuracy(accuracy);
        }

        // Stop watching after getting a reasonably accurate location (< 50 meters)
        if (accuracy < 50) {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error("Error getting high-accuracy location:", error);
        setLocationLoading(false);
        // Fall back to regular location if high accuracy fails
        getUserLocation();
      },
      options
    );

    // Set a maximum time for high accuracy attempt
    setTimeout(() => {
      if (locationLoading) {
        setLocationLoading(false);
      }
    }, 15000);
  };

  // Function to set manual location
  const setManualLocationHandler = () => {
    const lat = parseFloat(manualLocation.lat);
    const lng = parseFloat(manualLocation.lng);

    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid latitude and longitude values.");
      return;
    }

    if (lat < -90 || lat > 90) {
      alert("Latitude must be between -90 and 90.");
      return;
    }

    if (lng < -180 || lng > 180) {
      alert("Longitude must be between -180 and 180.");
      return;
    }

    setUserLocation([lat, lng]);
    setLocationAccuracy(null);
    setShowManualInput(false);
    setManualLocation({ lat: "", lng: "" });
    console.log("Manual location set:", { lat, lng });
  };

  // Preset locations for testing
  const presetLocations = [
    { name: "Bangalore", coords: [12.9716, 77.5946] },
    { name: "Mumbai", coords: [19.076, 72.8777] },
    { name: "Delhi", coords: [28.6139, 77.209] },
    { name: "Chennai", coords: [13.0827, 80.2707] },
    { name: "Kolkata", coords: [22.5726, 88.3639] },
  ];

  const setPresetLocation = (coords: [number, number]) => {
    setUserLocation(coords);
    setLocationAccuracy(null);
    console.log("Preset location set:", coords);
  };

  // Sample data for demonstrations
  const sampleServices: Service[] = [
    {
      _id: "service1",
      name: "Expert Plumbing Services",
      description: "Professional plumbing repair and installation services",
      category: "plumbing",
      price: 50,
      available: true,
      provider: {
        id: "provider1",
        name: "John Doe",
        email: "john@example.com",
        role: "provider" as const,
        serviceArea: {
          center: { latitude: 12.9716, longitude: 77.5946 },
          radius: 10,
        },
        rating: { average: 4.5, count: 20 },
      },
    },
    {
      _id: "service2",
      name: "Electrical Repairs",
      description: "Fast and reliable electrical repair services",
      category: "electrical",
      price: 60,
      available: true,
      provider: {
        id: "provider2",
        name: "Jane Smith",
        email: "jane@example.com",
        role: "provider" as const,
        serviceArea: {
          center: { latitude: 12.98, longitude: 77.6 },
          radius: 15,
        },
        rating: { average: 4.8, count: 35 },
      },
    },
  ];

  const basicMarkers = [
    {
      id: "marker1",
      position: [12.9716, 77.5946] as [number, number],
      popup: (
        <div className="p-2">
          <h3 className="font-semibold">Bangalore</h3>
          <p className="text-sm text-gray-600">Silicon Valley of India</p>
        </div>
      ),
    },
    {
      id: "marker2",
      position: [12.98, 77.6] as [number, number],
      popup: (
        <div className="p-2">
          <h3 className="font-semibold">Tech Hub</h3>
          <p className="text-sm text-gray-600">Major IT companies location</p>
        </div>
      ),
    },
  ];

  const handleDemoChange = (
    demo: "basic" | "services" | "issues" | "report"
  ) => {
    setActiveDemo(demo);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          {mode === "report" && (
            <div className="flex items-center mb-4">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2"
                onClick={handleBackToIssues}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Issues</span>
              </Button>
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {mode === "report"
              ? "Report an Issue"
              : "Interactive Map Features Demo"}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {mode === "report"
              ? "Click on the map to select a location and report an issue in your community"
              : "Explore our comprehensive map integration for services, issues, and location-based features"}
          </p>
        </div>

        {/* Navigation - Hidden in report mode */}
        {mode !== "report" && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-4">
                  <Button
                    variant={activeDemo === "basic" ? "default" : "outline"}
                    size="sm"
                    className="flex items-center space-x-2"
                    onClick={() => handleDemoChange("basic")}
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Basic Map</span>
                  </Button>
                  <Button
                    variant={activeDemo === "services" ? "default" : "outline"}
                    size="sm"
                    className="flex items-center space-x-2"
                    onClick={() => handleDemoChange("services")}
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Services Map</span>
                  </Button>
                  <Button
                    variant={activeDemo === "issues" ? "default" : "outline"}
                    size="sm"
                    className="flex items-center space-x-2"
                    onClick={() => handleDemoChange("issues")}
                  >
                    <List className="w-4 h-4" />
                    <span>Issues Map</span>
                  </Button>
                  <Button
                    variant={activeDemo === "report" ? "default" : "outline"}
                    size="sm"
                    className="flex items-center space-x-2"
                    onClick={() => handleDemoChange("report")}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Report Issue</span>
                  </Button>
                </div>

                {/* Location Buttons */}
                <div className="flex flex-col space-y-2">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2"
                      onClick={getUserLocation}
                      disabled={locationLoading}
                    >
                      {locationLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Navigation className="w-4 h-4" />
                      )}
                      <span>
                        {locationLoading
                          ? "Getting Location..."
                          : "My Location"}
                      </span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2"
                      onClick={getHighAccuracyLocation}
                      disabled={locationLoading}
                    >
                      {locationLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                      <span>High Accuracy</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className=""
                      onClick={() => setShowManualInput(!showManualInput)}
                    >
                      Manual
                    </Button>
                  </div>

                  {/* Manual Location Input */}
                  {showManualInput && (
                    <div className="space-y-2">
                      <div className="flex space-x-2 p-2 bg-gray-50 rounded">
                        <Input
                          type="text"
                          placeholder="Latitude"
                          value={manualLocation.lat}
                          onChange={(e) =>
                            setManualLocation({
                              ...manualLocation,
                              lat: e.target.value,
                            })
                          }
                          className="w-24 h-8 text-xs"
                        />
                        <Input
                          type="text"
                          placeholder="Longitude"
                          value={manualLocation.lng}
                          onChange={(e) =>
                            setManualLocation({
                              ...manualLocation,
                              lng: e.target.value,
                            })
                          }
                          className="w-24 h-8 text-xs"
                        />
                        <Button
                          variant="default"
                          size="sm"
                          onClick={setManualLocationHandler}
                          className="h-8 text-xs"
                        >
                          Set
                        </Button>
                      </div>

                      {/* Preset Locations */}
                      <div className="flex flex-wrap gap-1">
                        {presetLocations.map((location) => (
                          <Button
                            key={location.name}
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPresetLocation(
                                location.coords as [number, number]
                              )
                            }
                            className="h-6 text-xs px-2"
                          >
                            {location.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Location Info */}
                  <div className="text-xs text-gray-600">
                    <div>
                      Lat: {userLocation[0].toFixed(6)}, Lng:{" "}
                      {userLocation[1].toFixed(6)}
                    </div>
                    {locationAccuracy && (
                      <div>Accuracy: ±{Math.round(locationAccuracy)}m</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Demo Content */}
        <Card className="">
          <CardHeader className="">
            <CardTitle className="">
              {activeDemo === "basic" && "Basic Interactive Map"}
              {activeDemo === "services" && "Services & Providers Map"}
              {activeDemo === "issues" && "Community Issues Map"}
              {activeDemo === "report" && "Report New Issue"}
            </CardTitle>
          </CardHeader>
          <CardContent className="">
            {activeDemo === "basic" && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  A basic interactive map with clickable markers and popups.
                  Perfect for displaying locations with detailed information.
                </p>
                <Map
                  center={userLocation}
                  zoom={13}
                  height="500px"
                  markers={basicMarkers}
                  onClick={(e) => {
                    console.log("Map clicked at:", e.latlng);
                    alert(
                      `Clicked at: ${e.latlng.lat.toFixed(
                        4
                      )}, ${e.latlng.lng.toFixed(4)}`
                    );
                  }}
                />
              </div>
            )}

            {activeDemo === "services" && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Discover and book services from verified providers. Shows
                  service areas, ratings, and pricing information.
                </p>
                <ServicesMap
                  services={sampleServices}
                  userLocation={userLocation}
                  height="500px"
                  onServiceSelect={(service) => {
                    alert(`Selected service: ${service.name}`);
                  }}
                />
              </div>
            )}

            {activeDemo === "issues" && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  View and track community-reported issues on an interactive
                  map. Filter by status, category, and priority.
                </p>

                {!user ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">
                      Please log in to view issues on the map
                    </p>
                    <Button
                      onClick={() => router.push("/login")}
                      variant="default"
                      size="default"
                      className=""
                    >
                      Login
                    </Button>
                  </div>
                ) : issuesLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="ml-2">Loading issues...</span>
                  </div>
                ) : issuesError ? (
                  <div className="text-center py-8">
                    <p className="text-red-600 mb-4">{issuesError}</p>
                    <Button
                      onClick={fetchRealIssues}
                      variant="outline"
                      size="default"
                      className=""
                    >
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <IssuesMap
                    issues={realIssues}
                    userLocation={userLocation}
                    height="500px"
                    onIssueSelect={handleIssueSelect}
                  />
                )}
              </div>
            )}

            {activeDemo === "report" && (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Report new issues with precise location data. Click on the map
                  or use your current location.
                </p>
                <IssueReportMap
                  initialLocation={userLocation}
                  onIssueSubmitted={(issue) => {
                    if (mode === "report") {
                      // Show success message and redirect back to issues
                      alert(`Issue reported successfully: ${issue.title}`);
                      setTimeout(() => {
                        router.push("/consumer-dashboard/issues");
                      }, 1500);
                    } else {
                      alert(`Issue reported: ${issue.title}`);
                    }
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features Overview - Hidden in report mode */}
        {mode !== "report" && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold">Interactive Maps</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Click, zoom, and explore with full interactivity
                </p>
              </CardContent>
            </Card>

            <Card className="">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 mb-2">
                  <Navigation className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold">Service Areas</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Visual service coverage with radius indicators
                </p>
              </CardContent>
            </Card>

            <Card className="">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 mb-2">
                  <List className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold">Issue Tracking</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Real-time issue status and priority visualization
                </p>
              </CardContent>
            </Card>

            <Card className="">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 mb-2">
                  <Plus className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold">Easy Reporting</h3>
                </div>
                <p className="text-sm text-gray-600">
                  One-click location selection for issue reporting
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

// Loading fallback component
const MapDemoLoading = () => (
  <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
      <p className="text-gray-600">Loading map...</p>
    </div>
  </div>
);

// Main component with Suspense boundary
const MapDemo: React.FC = () => {
  return (
    <Suspense fallback={<MapDemoLoading />}>
      <MapDemoContent />
    </Suspense>
  );
};

export default MapDemo;
