"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import api, { dashboardAPI } from "../../lib/api";
import {
  Calendar,
  Clock,
  DollarSign,
  Loader2,
  AlertCircle,
  TrendingUp,
  Star,
  CheckCircle,
  MapPin,
  Settings,
} from "lucide-react";

interface ProviderDashboardStats {
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalEarnings: number;
  thisMonthEarnings: number;
  averageRating: number;
  totalReviews: number;
  isVerified: boolean;
  completionRate: number;
  assignedIssues: number;
}

export default function ProviderDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<ProviderDashboardStats>({
    totalBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    totalEarnings: 0,
    thisMonthEarnings: 0,
    averageRating: 0,
    totalReviews: 0,
    isVerified: false,
    completionRate: 0,
    assignedIssues: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviderStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the dedicated provider dashboard API function
      const providerStats = await dashboardAPI.getProviderStats();

      // Get provider profile for verification status using correct endpoint
      try {
        const profileResponse = await api.get("/api/provider/profile/me");
        const profile = profileResponse.data.data || {};

        // Fetch assigned issues count
        let assignedIssuesCount = 0;
        try {
          const assignedResponse = await api.get("/api/issues/assigned/count");
          assignedIssuesCount = assignedResponse.data.data?.count || 0;
        } catch (issuesError) {
          console.warn("Could not fetch assigned issues count:", issuesError);
        }

        setStats({
          ...providerStats,
          isVerified: profile.verification?.isVerified || false,
          totalReviews: providerStats.completedBookings, // Assuming each completed booking has a review
          assignedIssues: assignedIssuesCount,
        });
      } catch (profileError) {
        console.warn("Could not fetch provider profile:", profileError);
        // Set stats without verification status
        setStats({
          ...providerStats,
          isVerified: false,
          totalReviews: providerStats.completedBookings,
          assignedIssues: 0, // TODO: Fetch from API
        });
      }
    } catch (err: any) {
      console.error("Error fetching provider stats:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load provider dashboard statistics"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviderStats();
  }, []);

  if (loading) {
    return (
      <ProtectedRoute requiredRole="provider" fallbackPath="/login">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-600 dark:text-gray-300">
              Loading provider dashboard...
            </span>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredRole="provider" fallbackPath="/login">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">{error}</p>
              <button
                onClick={fetchProviderStats}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="provider" fallbackPath="/login">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                  <Star className="h-8 w-8 text-yellow-500 mr-3" />
                  Provider Dashboard
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  Manage your services and track your performance
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {stats.isVerified ? (
                  <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>Verified</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                    <Clock className="h-4 w-4" />
                    <span>Pending Verification</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!stats.isVerified && stats.totalBookings === 0 && (
            <div className="mb-6">
              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Setup Required</span>
                  </div>
                  <p className="mt-2 text-yellow-700 dark:text-yellow-300 text-sm">
                    Your provider profile needs to be set up and verified to
                    start receiving bookings. Some dashboard features may show
                    limited data until your profile is complete.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Bookings Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Bookings
                </CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent className="">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalBookings}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  All time bookings
                </p>
              </CardContent>
            </Card>

            {/* Assigned Issues Card */}
            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push("/provider-dashboard/issues")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Assigned Issues
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent className="">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.assignedIssues || 0}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Issues to handle
                </p>
              </CardContent>
            </Card>

            {/* Pending Bookings Card */}
            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push("/provider-dashboard/bookings")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Pending Bookings
                </CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent className="">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.pendingBookings}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Awaiting response
                </p>
              </CardContent>
            </Card>

            {/* Total Earnings Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Earnings
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent className="">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₹{stats.totalEarnings.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  All time earnings
                </p>
              </CardContent>
            </Card>

            {/* Average Rating Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Average Rating
                </CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent className="">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.averageRating.toFixed(1)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Based on {stats.totalReviews} reviews
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Performance Overview */}
            <Card className="">
              <CardHeader className="">
                <CardTitle className="">Performance Metrics</CardTitle>
                <CardDescription className="">
                  Your service performance overview
                </CardDescription>
              </CardHeader>
              <CardContent className="">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Completion Rate
                    </span>
                    <span className="font-medium">
                      {stats.completionRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${stats.completionRate}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">This Month</span>
                    <span className="font-medium">
                      ₹{stats.thisMonthEarnings.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Completed Jobs
                    </span>
                    <span className="font-medium">
                      {stats.completedBookings}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Status */}
            <Card className="">
              <CardHeader className="">
                <CardTitle className="">Booking Status</CardTitle>
                <CardDescription className="">
                  Current status of your bookings
                </CardDescription>
              </CardHeader>
              <CardContent className="">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Completed</span>
                    </div>
                    <span className="font-medium">
                      {stats.completedBookings}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-sm">Pending</span>
                    </div>
                    <span className="font-medium">{stats.pendingBookings}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Cancelled</span>
                    </div>
                    <span className="font-medium">
                      {stats.cancelledBookings}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="">
              <CardHeader className="">
                <CardTitle className="">Quick Actions</CardTitle>
                <CardDescription className="">
                  Manage your provider account
                </CardDescription>
              </CardHeader>
              <CardContent className="">
                <div className="space-y-2">
                  <button className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">View Bookings</span>
                    </div>
                  </button>
                  <button className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4 text-gray-600" />
                      <span className="font-medium">Manage Services</span>
                    </div>
                  </button>
                  <button className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Update Location</span>
                    </div>
                  </button>
                  <button className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">View Analytics</span>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="">
            <CardHeader className="">
              <CardTitle className="">Recent Activity</CardTitle>
              <CardDescription className="">
                Latest updates and notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Dashboard Updated</p>
                    <p className="text-xs text-gray-500">
                      {stats.totalBookings} total bookings,{" "}
                      {stats.pendingBookings} pending jobs
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">Now</span>
                </div>

                {stats.pendingBookings > 0 && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Pending Jobs</p>
                      <p className="text-xs text-gray-500">
                        You have {stats.pendingBookings} jobs awaiting
                        completion
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">Ongoing</span>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Monthly Earnings</p>
                    <p className="text-xs text-gray-500">
                      ₹{stats.thisMonthEarnings.toLocaleString()} earned this
                      month
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">Updated</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
