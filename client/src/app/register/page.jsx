"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useUserActions } from "../../store/userStore";
import { authAPI } from "../../lib/api";
import useAuth from "../../hooks/useAuth";
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  MapPin,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wrench,
  Shield,
  Building,
  Calendar,
  Briefcase,
  FileText,
  Phone,
  Globe,
  Camera,
  ChevronDown,
  Key,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const auth = useAuth();

  const [formData, setFormData] = useState({
    // Basic Information
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",

    // Address Information
    address: "",
    city: "",
    state: "",
    pincode: "",

    // Account Information
    password: "",
    confirmPassword: "",
    userType: "user", // "admin" or "user"
    role: "consumer", // "consumer" or "provider" (only for user type)

    // Provider-specific fields
    businessName: "",
    businessCategory: "",
    experience: "",
    description: "",
    website: "",
    govtIdNumber: "",

    // Admin security fields
    securityQuestion: "",
    securityAnswer: "",

    // Additional fields
    profileImage: null,
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [showUserRoleDropdown, setShowUserRoleDropdown] = useState(false);

  // Dropdown refs for click-outside functionality
  const dropdownRef = useRef(null);
  const userRoleDropdownRef = useRef(null);

  // Handle click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAdminDropdown(false);
      }
      if (
        userRoleDropdownRef.current &&
        !userRoleDropdownRef.current.contains(event.target)
      ) {
        setShowUserRoleDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    // Basic Information - Required fields
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\+?[\d\s-()]{10,}$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    // Address validation - Required
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }
    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }
    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    }
    if (!formData.pincode.trim()) {
      newErrors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Pincode must be 6 digits";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // User type validation
    if (!formData.userType || !["admin", "user"].includes(formData.userType)) {
      newErrors.userType = "Please select a valid user type";
    }

    // Role validation (only for user type)
    if (formData.userType === "user") {
      if (!formData.role || !["consumer", "provider"].includes(formData.role)) {
        newErrors.role = "Please select a valid role";
      }

      // Provider-specific validations
      if (formData.role === "provider") {
        if (!formData.businessName.trim()) {
          newErrors.businessName = "Business name is required for providers";
        }
        if (!formData.businessCategory.trim()) {
          newErrors.businessCategory = "Business category is required";
        }
        if (!formData.govtIdNumber.trim()) {
          newErrors.govtIdNumber = "Government ID is required for verification";
        }
      }
    }

    // Admin security validation
    if (formData.userType === "admin") {
      if (!formData.securityQuestion.trim()) {
        newErrors.securityQuestion =
          "Security question is required for admin accounts";
      }
      if (!formData.securityAnswer.trim()) {
        newErrors.securityAnswer =
          "Security answer is required for admin accounts";
      }
      // Predefined correct answer for admin verification
      const correctAnswer = "hackademia2025";
      if (formData.securityAnswer.toLowerCase().trim() !== correctAnswer) {
        newErrors.securityAnswer =
          "Incorrect security answer. Contact system administrator for access.";
      }
    }

    // Website validation (if provided)
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = "Please enter a valid website URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setErrors({});

    const registrationData = {
      name: formData.name.trim(),
      email: formData.email.toLowerCase().trim(),
      phone: formData.phone.trim(),
      password: formData.password,
      role: formData.userType === "admin" ? "admin" : formData.role,
    };

    // Add admin key for admin registration
    if (formData.userType === "admin") {
      registrationData.adminKey = formData.securityAnswer.toLowerCase().trim();
    }

    const result = await auth.register(registrationData);

    if (result.success) {
      // Redirect to appropriate dashboard
      router.push(result.redirectPath);
    } else {
      setErrors({
        general: result.error,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">H</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  HACKADEMIA
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Registration
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
            >
              Already have an account?
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* General Error */}
          {errors.general && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg max-w-4xl mx-auto">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Step 1: Account Type Selection */}
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Account Type</span>
              </CardTitle>
              <CardDescription>
                Choose your account type to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Main Account Type Dropdown */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select Account Type *
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowAdminDropdown(!showAdminDropdown)}
                      className={`w-full p-4 text-left border-2 rounded-lg transition-all flex items-center justify-between ${
                        formData.userType
                          ? formData.userType === "admin"
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                            : "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                      disabled={auth.isLoading}
                    >
                      <div className="flex items-center space-x-3">
                        {formData.userType === "admin" ? (
                          <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        ) : formData.userType === "user" ? (
                          <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-600" />
                        )}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {formData.userType === "admin"
                              ? "Admin Account"
                              : formData.userType === "user"
                              ? "User Account"
                              : "Select account type"}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formData.userType === "admin"
                              ? "Manage platform, users, and oversee all operations"
                              : formData.userType === "user"
                              ? "Citizen or service provider accessing platform services"
                              : "Choose how you want to use HACKADEMIA"}
                          </div>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          showAdminDropdown ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown Options */}
                    {showAdminDropdown && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                        <div className="p-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleInputChange("userType", "admin");
                              handleInputChange("role", "");
                              setShowAdminDropdown(false);
                            }}
                            className={`w-full p-3 text-left rounded-md transition-all hover:bg-purple-50 dark:hover:bg-purple-900/20 ${
                              formData.userType === "admin"
                                ? "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700"
                                : ""
                            }`}
                            disabled={auth.isLoading}
                          >
                            <div className="flex items-center space-x-3">
                              <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  Admin Account
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  Manage platform, users, and oversee all
                                  operations
                                </div>
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleInputChange("userType", "user");
                              if (!formData.role || formData.role === "") {
                                handleInputChange("role", "consumer");
                              }
                              setShowAdminDropdown(false);
                            }}
                            className={`w-full p-3 text-left rounded-md transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                              formData.userType === "user"
                                ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700"
                                : ""
                            }`}
                            disabled={auth.isLoading}
                          >
                            <div className="flex items-center space-x-3">
                              <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  User Account
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  Citizen or service provider accessing platform
                                  services
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Role Selection - Only for User accounts */}
                {formData.userType === "user" && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                      Select User Role
                    </h3>
                    <div className="relative" ref={userRoleDropdownRef}>
                      <button
                        type="button"
                        onClick={() =>
                          setShowUserRoleDropdown(!showUserRoleDropdown)
                        }
                        className="w-full p-4 text-left bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={auth.isLoading}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {formData.role === "consumer" ? (
                              <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                            ) : (
                              <Wrench className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            )}
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {formData.role === "consumer"
                                  ? "Consumer"
                                  : "Service Provider"}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {formData.role === "consumer"
                                  ? "Report issues & book services"
                                  : "Offer services to citizens"}
                              </div>
                            </div>
                          </div>
                          <ChevronDown
                            className={`w-5 h-5 text-gray-400 transition-transform ${
                              showUserRoleDropdown ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </button>

                      {showUserRoleDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10">
                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                handleInputChange("role", "consumer");
                                setShowUserRoleDropdown(false);
                              }}
                              className={`w-full p-3 text-left rounded-md transition-all hover:bg-green-50 dark:hover:bg-green-900/20 ${
                                formData.role === "consumer"
                                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700"
                                  : ""
                              }`}
                              disabled={auth.isLoading}
                            >
                              <div className="flex items-center space-x-3">
                                <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    Consumer
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Report issues & book services
                                  </div>
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleInputChange("role", "provider");
                                setShowUserRoleDropdown(false);
                              }}
                              className={`w-full p-3 text-left rounded-md transition-all hover:bg-orange-50 dark:hover:bg-orange-900/20 ${
                                formData.role === "provider"
                                  ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700"
                                  : ""
                              }`}
                              disabled={auth.isLoading}
                            >
                              <div className="flex items-center space-x-3">
                                <Wrench className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    Service Provider
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Offer services to citizens
                                  </div>
                                </div>
                              </div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Admin Role Confirmation - Only for Admin accounts */}
                {formData.userType === "admin" && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        <div>
                          <h3 className="font-medium text-purple-900 dark:text-purple-300">
                            Administrator Account
                          </h3>
                          <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                            You will have full access to manage the platform,
                            oversee all users, handle municipal operations, and
                            configure system settings.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Error messages */}
              {errors.userType && (
                <p className="text-sm text-red-600 flex items-center space-x-1 mt-4">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.userType}</span>
                </p>
              )}
              {errors.role && (
                <p className="text-sm text-red-600 flex items-center space-x-1 mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.role}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Basic Information */}
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Basic Information</span>
              </CardTitle>
              <CardDescription>Tell us about yourself</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      className={`pl-10 ${
                        errors.name ? "border-red-500 focus:border-red-500" : ""
                      }`}
                      disabled={auth.isLoading}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.name}</span>
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      className={`pl-10 ${
                        errors.email
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }`}
                      disabled={auth.isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label
                    htmlFor="phone"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      className={`pl-10 ${
                        errors.phone
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }`}
                      disabled={auth.isLoading}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.phone}</span>
                    </p>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <label
                    htmlFor="dateOfBirth"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        handleInputChange("dateOfBirth", e.target.value)
                      }
                      className="pl-10"
                      disabled={auth.isLoading}
                    />
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <label
                    htmlFor="gender"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Gender
                  </label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) =>
                      handleInputChange("gender", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    disabled={auth.isLoading}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Address Information */}
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Address Information</span>
              </CardTitle>
              <CardDescription>Your location details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6">
                {/* Full Address */}
                <div className="space-y-2">
                  <label
                    htmlFor="address"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Full Address *
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="address"
                      type="text"
                      placeholder="Enter your complete address"
                      value={formData.address}
                      onChange={(e) =>
                        handleInputChange("address", e.target.value)
                      }
                      className={`pl-10 ${
                        errors.address
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }`}
                      disabled={auth.isLoading}
                    />
                  </div>
                  {errors.address && (
                    <p className="text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.address}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* City */}
                  <div className="space-y-2">
                    <label
                      htmlFor="city"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      City *
                    </label>
                    <Input
                      id="city"
                      type="text"
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) =>
                        handleInputChange("city", e.target.value)
                      }
                      className={
                        errors.city ? "border-red-500 focus:border-red-500" : ""
                      }
                      disabled={auth.isLoading}
                    />
                    {errors.city && (
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.city}</span>
                      </p>
                    )}
                  </div>

                  {/* State */}
                  <div className="space-y-2">
                    <label
                      htmlFor="state"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      State *
                    </label>
                    <Input
                      id="state"
                      type="text"
                      placeholder="State"
                      value={formData.state}
                      onChange={(e) =>
                        handleInputChange("state", e.target.value)
                      }
                      className={
                        errors.state
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }
                      disabled={auth.isLoading}
                    />
                    {errors.state && (
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.state}</span>
                      </p>
                    )}
                  </div>

                  {/* Pincode */}
                  <div className="space-y-2">
                    <label
                      htmlFor="pincode"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Pincode *
                    </label>
                    <Input
                      id="pincode"
                      type="text"
                      placeholder="Pincode"
                      value={formData.pincode}
                      onChange={(e) =>
                        handleInputChange("pincode", e.target.value)
                      }
                      className={
                        errors.pincode
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }
                      disabled={auth.isLoading}
                    />
                    {errors.pincode && (
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.pincode}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 4: Provider Details (only shown for providers) */}
          {formData.userType === "user" && formData.role === "provider" && (
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="w-5 h-5" />
                  <span>Provider Information</span>
                </CardTitle>
                <CardDescription>
                  Business details for service providers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Business Name */}
                  <div className="space-y-2">
                    <label
                      htmlFor="businessName"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Business Name *
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="businessName"
                        type="text"
                        placeholder="Your business name"
                        value={formData.businessName}
                        onChange={(e) =>
                          handleInputChange("businessName", e.target.value)
                        }
                        className={`pl-10 ${
                          errors.businessName
                            ? "border-red-500 focus:border-red-500"
                            : ""
                        }`}
                        disabled={auth.isLoading}
                      />
                    </div>
                    {errors.businessName && (
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.businessName}</span>
                      </p>
                    )}
                  </div>

                  {/* Business Category */}
                  <div className="space-y-2">
                    <label
                      htmlFor="businessCategory"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Business Category *
                    </label>
                    <select
                      id="businessCategory"
                      value={formData.businessCategory}
                      onChange={(e) =>
                        handleInputChange("businessCategory", e.target.value)
                      }
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${
                        errors.businessCategory
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }`}
                      disabled={auth.isLoading}
                    >
                      <option value="">Select Category</option>
                      <option value="plumber">Plumber</option>
                      <option value="electrician">Electrician</option>
                      <option value="carpenter">Carpenter</option>
                      <option value="cleaner">Cleaning Service</option>
                      <option value="painter">Painter</option>
                      <option value="mechanic">Mechanic</option>
                      <option value="gardener">Gardener</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.businessCategory && (
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.businessCategory}</span>
                      </p>
                    )}
                  </div>

                  {/* Experience */}
                  <div className="space-y-2">
                    <label
                      htmlFor="experience"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Years of Experience
                    </label>
                    <Input
                      id="experience"
                      type="number"
                      placeholder="Years of experience"
                      value={formData.experience}
                      onChange={(e) =>
                        handleInputChange("experience", e.target.value)
                      }
                      min="0"
                      disabled={auth.isLoading}
                    />
                  </div>

                  {/* Website */}
                  <div className="space-y-2">
                    <label
                      htmlFor="website"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Website
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="website"
                        type="url"
                        placeholder="https://your-website.com"
                        value={formData.website}
                        onChange={(e) =>
                          handleInputChange("website", e.target.value)
                        }
                        className={`pl-10 ${
                          errors.website
                            ? "border-red-500 focus:border-red-500"
                            : ""
                        }`}
                        disabled={auth.isLoading}
                      />
                    </div>
                    {errors.website && (
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.website}</span>
                      </p>
                    )}
                  </div>

                  {/* Government ID */}
                  <div className="space-y-2 md:col-span-2">
                    <label
                      htmlFor="govtIdNumber"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Government ID Number *
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="govtIdNumber"
                        type="text"
                        placeholder="Aadhaar, PAN, or other government ID"
                        value={formData.govtIdNumber}
                        onChange={(e) =>
                          handleInputChange("govtIdNumber", e.target.value)
                        }
                        className={`pl-10 ${
                          errors.govtIdNumber
                            ? "border-red-500 focus:border-red-500"
                            : ""
                        }`}
                        disabled={auth.isLoading}
                      />
                    </div>
                    {errors.govtIdNumber && (
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.govtIdNumber}</span>
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-2 md:col-span-2">
                    <label
                      htmlFor="description"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Business Description
                    </label>
                    <textarea
                      id="description"
                      placeholder="Describe your services and experience"
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      disabled={auth.isLoading}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Security & Emergency Contact */}
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="w-5 h-5" />
                <span>Security & Emergency Contact</span>
              </CardTitle>
              <CardDescription>
                Set up your password and emergency contact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Password */}
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      className={`pl-10 pr-10 ${
                        errors.password
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }`}
                      disabled={auth.isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      disabled={auth.isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.password}</span>
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      className={`pl-10 pr-10 ${
                        errors.confirmPassword
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }`}
                      disabled={auth.isLoading}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      disabled={auth.isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.confirmPassword}</span>
                    </p>
                  )}
                </div>

                {/* Admin Security Fields - Only for Admin accounts */}
                {formData.userType === "admin" && (
                  <>
                    <div className="space-y-2">
                      <label
                        htmlFor="securityQuestion"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Admin Security Question *
                      </label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <select
                          id="securityQuestion"
                          value={formData.securityQuestion}
                          onChange={(e) =>
                            handleInputChange(
                              "securityQuestion",
                              e.target.value
                            )
                          }
                          className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${
                            errors.securityQuestion
                              ? "border-red-500 focus:border-red-500"
                              : ""
                          }`}
                          disabled={auth.isLoading}
                        >
                          <option value="">Select Security Question</option>
                          <option value="hackademia-access">
                            What is the special access code for HACKADEMIA admin
                            registration?
                          </option>
                        </select>
                      </div>
                      {errors.securityQuestion && (
                        <p className="text-sm text-red-600 flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{errors.securityQuestion}</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="securityAnswer"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Security Answer *
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="securityAnswer"
                          type="text"
                          placeholder="Enter the security answer"
                          value={formData.securityAnswer}
                          onChange={(e) =>
                            handleInputChange("securityAnswer", e.target.value)
                          }
                          className={`pl-10 ${
                            errors.securityAnswer
                              ? "border-red-500 focus:border-red-500"
                              : ""
                          }`}
                          disabled={auth.isLoading}
                        />
                      </div>
                      {errors.securityAnswer && (
                        <p className="text-sm text-red-600 flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{errors.securityAnswer}</span>
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Contact the system administrator for the correct answer
                        if you are authorized to create admin accounts.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="max-w-4xl mx-auto">
            <Button
              type="submit"
              className="w-full py-3 text-lg"
              disabled={auth.isLoading}
            >
              {auth.isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Create Account
                </>
              )}
            </Button>

            {/* Terms and Privacy */}
            <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              By creating an account, you agree to our{" "}
              <Link
                href="/terms"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
