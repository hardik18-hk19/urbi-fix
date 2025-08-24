"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import ProtectedRoute from "../../components/ProtectedRoute";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useToast } from "../../contexts/ToastContext";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Globe,
  Calendar,
  Shield,
  Star,
  Edit3,
  Save,
  X,
  Camera,
  Briefcase,
  Settings,
  Award,
} from "lucide-react";

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

interface BusinessInfo {
  businessName: string;
  businessType: string;
  website: string;
}

interface ProfileData {
  user: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  profile?: any;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  address: Address;
  businessInfo: BusinessInfo;
  preferences: any;
}

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
    },
    businessInfo: {
      businessName: "",
      businessType: "",
      website: "",
    },
    preferences: {},
  });

  const fetchProfileData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch user basic info using correct API URL
      const userData = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      ).then((res) => res.json());

      // Fetch role-specific profile data
      let profileData = null;
      if (user?.role === "consumer") {
        try {
          const profileResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/consumer/profile`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("authToken")}`,
              },
            }
          );
          if (profileResponse.ok) {
            const response = await profileResponse.json();
            profileData = response.data;
          }
        } catch (error) {
          console.log("Consumer profile not found, creating default");
        }
      } else if (user?.role === "provider") {
        try {
          const profileResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/provider/profile/me`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("authToken")}`,
              },
            }
          );
          if (profileResponse.ok) {
            const response = await profileResponse.json();
            profileData = response.data;
          }
        } catch (error) {
          console.log("Provider profile not found, creating default");
        }
      }

      setProfileData({
        user: userData.user || userData,
        profile: profileData,
      });

      // Initialize form data
      setFormData({
        name: userData.user?.name || userData.name || "",
        email: userData.user?.email || userData.email || "",
        phone: userData.user?.phone || userData.phone || "",
        address: profileData?.address ||
          profileData?.contactInfo?.address || {
            street: "",
            city: "",
            state: "",
            zipCode: "",
          },
        businessInfo: profileData?.businessInfo || {
          businessName: "",
          businessType: "",
          website: "",
        },
        preferences: profileData?.preferences || {},
      });
    } catch (error) {
      console.error("Failed to fetch profile data:", error);
      addToast({ message: "Failed to load profile data", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [user?.role, addToast]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchProfileData();
    }
  }, [isAuthenticated, user, fetchProfileData]);

  const handleInputChange = (field: string, value: any) => {
    const keys = field.split(".");
    if (keys.length === 1) {
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      setFormData((prev) => {
        const fieldKey = keys[0] as keyof FormData;
        const nestedKey = keys[1];
        const currentValue = prev[fieldKey];

        if (typeof currentValue === "object" && currentValue !== null) {
          return {
            ...prev,
            [fieldKey]: {
              ...currentValue,
              [nestedKey]: value,
            },
          };
        }
        return prev;
      });
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Update user basic info
      const userUpdateResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/update-profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
          }),
        }
      );

      if (!userUpdateResponse.ok) {
        throw new Error("Failed to update user information");
      }

      // Update role-specific profile
      let profileUpdateResponse = null;
      if (user?.role === "consumer") {
        profileUpdateResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/consumer/profile`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
            body: JSON.stringify({
              address: formData.address,
              phoneNumber: formData.phone,
              preferences: formData.preferences,
            }),
          }
        );
      } else if (user?.role === "provider") {
        profileUpdateResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/provider/profile`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
            body: JSON.stringify({
              businessInfo: formData.businessInfo,
              contactInfo: {
                phoneNumber: formData.phone,
                address: formData.address,
                website: formData.businessInfo.website,
              },
            }),
          }
        );
      }

      if (profileUpdateResponse && !profileUpdateResponse.ok) {
        throw new Error("Failed to update profile information");
      }

      await fetchProfileData();
      setIsEditing(false);
      addToast({ message: "Profile updated successfully", type: "success" });
    } catch (error) {
      console.error("Failed to update profile:", error);
      addToast({ message: "Failed to update profile", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data to original values
    if (profileData) {
      setFormData({
        name: profileData.user.name || "",
        email: profileData.user.email || "",
        phone: profileData.user.phone || "",
        address: profileData.profile?.address || {
          street: "",
          city: "",
          state: "",
          zipCode: "",
        },
        businessInfo: profileData.profile?.businessInfo || {
          businessName: "",
          businessType: "",
          website: "",
        },
        preferences: profileData.profile?.preferences || {},
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-5 h-5 text-purple-600" />;
      case "provider":
        return <Briefcase className="w-5 h-5 text-orange-600" />;
      case "consumer":
        return <User className="w-5 h-5 text-green-600" />;
      default:
        return <User className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "provider":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "consumer":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute requiredRole={null} fallbackPath="/login">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-8"></div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!profileData) {
    return (
      <ProtectedRoute requiredRole={null} fallbackPath="/login">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Profile Not Found
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Unable to load profile data. Please try again later.
              </p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole={null} fallbackPath="/login">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              My Profile
            </h1>
            <div className="flex space-x-3">
              {!isEditing ? (
                <Button
                  variant="default"
                  size="default"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    variant="default"
                    size="default"
                    onClick={handleSave}
                    className="flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleCancel}
                    className="flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Profile Summary */}
            <div className="space-y-6">
              {/* Profile Picture & Basic Info */}
              <Card className="">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="relative inline-block">
                      <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white text-2xl font-bold">
                          {profileData.user.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {isEditing && (
                        <button className="absolute bottom-0 right-0 w-8 h-8 bg-white dark:bg-gray-800 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700">
                          <Camera className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                      {profileData.user.name}
                    </h2>
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      {getRoleIcon(profileData.user.role)}
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(
                          profileData.user.role
                        )}`}
                      >
                        {profileData.user.role.toUpperCase()}
                      </span>
                    </div>
                    {user?.role === "provider" &&
                      profileData.profile?.businessInfo?.businessName && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          {profileData.profile.businessInfo.businessName}
                        </p>
                      )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats (for providers) */}
              {user?.role === "provider" && (
                <Card className="">
                  <CardHeader className="">
                    <CardTitle className="flex items-center space-x-2">
                      <Award className="w-5 h-5" />
                      <span>Statistics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {profileData.profile?.statistics?.totalBookings || 0}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Total Jobs
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-2xl font-bold text-yellow-600">
                            {profileData.profile?.rating?.averageRating?.toFixed(
                              1
                            ) || "0.0"}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Rating
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Detailed Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card className="">
                <CardHeader className="">
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Basic Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Full Name
                      </label>
                      {isEditing ? (
                        <Input
                          type="text"
                          className=""
                          value={formData.name}
                          onChange={(e) =>
                            handleInputChange("name", e.target.value)
                          }
                          placeholder="Enter your full name"
                        />
                      ) : (
                        <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{profileData.user.name}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email Address
                      </label>
                      <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{profileData.user.email}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Email cannot be changed
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone Number
                      </label>
                      {isEditing ? (
                        <Input
                          type="text"
                          className=""
                          value={formData.phone}
                          onChange={(e) =>
                            handleInputChange("phone", e.target.value)
                          }
                          placeholder="Enter your phone number"
                        />
                      ) : (
                        <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>
                            {profileData.user.phone || "Not provided"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Account Type
                      </label>
                      <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        {getRoleIcon(profileData.user.role)}
                        <span className="capitalize">
                          {profileData.user.role}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card className="">
                <CardHeader className="">
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5" />
                    <span>Address Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Street Address
                      </label>
                      {isEditing ? (
                        <Input
                          type="text"
                          className=""
                          value={formData.address.street}
                          onChange={(e) =>
                            handleInputChange("address.street", e.target.value)
                          }
                          placeholder="Enter street address"
                        />
                      ) : (
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          {formData.address.street || "Not provided"}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        City
                      </label>
                      {isEditing ? (
                        <Input
                          type="text"
                          className=""
                          value={formData.address.city}
                          onChange={(e) =>
                            handleInputChange("address.city", e.target.value)
                          }
                          placeholder="Enter city"
                        />
                      ) : (
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          {formData.address.city || "Not provided"}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        State
                      </label>
                      {isEditing ? (
                        <Input
                          type="text"
                          className=""
                          value={formData.address.state}
                          onChange={(e) =>
                            handleInputChange("address.state", e.target.value)
                          }
                          placeholder="Enter state"
                        />
                      ) : (
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          {formData.address.state || "Not provided"}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        ZIP Code
                      </label>
                      {isEditing ? (
                        <Input
                          type="text"
                          className=""
                          value={formData.address.zipCode}
                          onChange={(e) =>
                            handleInputChange("address.zipCode", e.target.value)
                          }
                          placeholder="Enter ZIP code"
                        />
                      ) : (
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          {formData.address.zipCode || "Not provided"}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Provider-specific Business Information */}
              {user?.role === "provider" && (
                <Card className="">
                  <CardHeader className="">
                    <CardTitle className="flex items-center space-x-2">
                      <Building className="w-5 h-5" />
                      <span>Business Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Business Name
                        </label>
                        {isEditing ? (
                          <Input
                            type="text"
                            className=""
                            value={formData.businessInfo.businessName}
                            onChange={(e) =>
                              handleInputChange(
                                "businessInfo.businessName",
                                e.target.value
                              )
                            }
                            placeholder="Enter business name"
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            {formData.businessInfo.businessName ||
                              "Not provided"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Business Type
                        </label>
                        {isEditing ? (
                          <select
                            value={formData.businessInfo.businessType}
                            onChange={(e) =>
                              handleInputChange(
                                "businessInfo.businessType",
                                e.target.value
                              )
                            }
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          >
                            <option value="">Select type</option>
                            <option value="individual">Individual</option>
                            <option value="company">Company</option>
                            <option value="franchise">Franchise</option>
                          </select>
                        ) : (
                          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            {formData.businessInfo.businessType ||
                              "Not provided"}
                          </div>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Website
                        </label>
                        {isEditing ? (
                          <Input
                            type="text"
                            className=""
                            value={formData.businessInfo.website}
                            onChange={(e) =>
                              handleInputChange(
                                "businessInfo.website",
                                e.target.value
                              )
                            }
                            placeholder="Enter website URL"
                          />
                        ) : (
                          <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <Globe className="w-4 h-4 text-gray-400" />
                            {formData.businessInfo.website ? (
                              <a
                                href={formData.businessInfo.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {formData.businessInfo.website}
                              </a>
                            ) : (
                              <span>Not provided</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Account Settings */}
              <Card className="">
                <CardHeader className="">
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Account Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          Account Created
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Member since {new Date().toLocaleDateString()}
                        </p>
                      </div>
                      <Calendar className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          Last Updated
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date().toLocaleDateString()}
                        </p>
                      </div>
                      <Edit3 className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
