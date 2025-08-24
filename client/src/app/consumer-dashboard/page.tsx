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
  FileText,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  MapPin,
  Plus,
  Star,
  Users,
} from "lucide-react";

interface ConsumerDashboardStats {
  totalIssues: number;
  openIssues: number;
  inProgressIssues: number;
  resolvedIssues: number;
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalSpent: number;
  thisMonthSpent: number;
  averageRating: number;
  favoriteProviders: number;
}

export default function ConsumerDashboardPage() {
  const [stats, setStats] = useState<ConsumerDashboardStats>({
    totalIssues: 0,
    openIssues: 0,
    inProgressIssues: 0,
    resolvedIssues: 0,
    totalBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    totalSpent: 0,
    thisMonthSpent: 0,
    averageRating: 0,
    favoriteProviders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConsumerStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the dedicated consumer dashboard API function
      const consumerStats = await dashboardAPI.getConsumerStats();

      // Calculate additional stats
      const cancelledBookings = 0; // Will be calculated when API provides this data
      const favoriteProviders = 0; // Will be calculated when API provides this data

      setStats({
        ...consumerStats,
        cancelledBookings,
        favoriteProviders,
      });
    } catch (err: any) {
      console.error("Error fetching consumer stats:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load consumer dashboard statistics"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsumerStats();
  }, []);

  if (loading) {
    return (
      <ProtectedRoute requiredRole="consumer" fallbackPath="/login">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-600 dark:text-gray-300">
              Loading consumer dashboard...
            </span>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredRole="consumer" fallbackPath="/login">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">{error}</p>
              <button
                onClick={fetchConsumerStats}
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
    <ProtectedRoute requiredRole="consumer" fallbackPath="/login">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              Consumer Dashboard
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Track your issues, bookings, and service history
            </p>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Issues Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Issues
                </CardTitle>
                <FileText className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent className="">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalIssues}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  All reported issues
                </p>
              </CardContent>
            </Card>

            {/* Open Issues Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Open Issues
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent className="">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.openIssues}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Awaiting resolution
                </p>
              </CardContent>
            </Card>

            {/* Total Bookings Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Bookings
                </CardTitle>
                <Calendar className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent className="">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalBookings}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  All service bookings
                </p>
              </CardContent>
            </Card>

            {/* Total Spent Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Spent
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent className="">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₹{stats.totalSpent.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  All time spending
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Activity Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Issues Breakdown */}
            <Card className="">
              <CardHeader className="">
                <CardTitle className="">Issues Overview</CardTitle>
                <CardDescription className="">
                  Current status of your issues
                </CardDescription>
              </CardHeader>
              <CardContent className="">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Open</span>
                    </div>
                    <span className="font-medium">{stats.openIssues}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">In Progress</span>
                    </div>
                    <span className="font-medium">
                      {stats.inProgressIssues}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Resolved</span>
                    </div>
                    <span className="font-medium">{stats.resolvedIssues}</span>
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
                  Common tasks and services
                </CardDescription>
              </CardHeader>
              <CardContent className="">
                <div className="space-y-2">
                  <button
                    onClick={() => (window.location.href = "/issues")}
                    className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Plus className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Report New Issue</span>
                    </div>
                  </button>
                  <button
                    onClick={() => (window.location.href = "/services")}
                    className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Book Service</span>
                    </div>
                  </button>
                  <button
                    onClick={() => (window.location.href = "/providers")}
                    className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">Find Providers</span>
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      (window.location.href = "/consumer-dashboard/bookings")
                    }
                    className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span className="font-medium">Track Status</span>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending Overview */}
            <Card className="">
              <CardHeader className="">
                <CardTitle className="">Spending Overview</CardTitle>
                <CardDescription className="">
                  Your service spending summary
                </CardDescription>
              </CardHeader>
              <CardContent className="">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">This Month</span>
                    <span className="font-medium">
                      ₹{stats.thisMonthSpent.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Average Rating Given
                    </span>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-medium">
                        {stats.averageRating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Providers Used
                    </span>
                    <span className="font-medium">
                      {stats.favoriteProviders}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Completed Services
                    </span>
                    <span className="font-medium">
                      {stats.completedBookings}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                        {stats.totalIssues} issues, {stats.totalBookings}{" "}
                        bookings tracked
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">Now</span>
                  </div>

                  {stats.openIssues > 0 && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Open Issues</p>
                        <p className="text-xs text-gray-500">
                          You have {stats.openIssues} issues awaiting resolution
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">Ongoing</span>
                    </div>
                  )}

                  {stats.pendingBookings > 0 && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Pending Bookings</p>
                        <p className="text-xs text-gray-500">
                          {stats.pendingBookings} services scheduled or in
                          progress
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">Active</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Monthly Spending</p>
                      <p className="text-xs text-gray-500">
                        ₹{stats.thisMonthSpent.toLocaleString()} spent this
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
      </div>
    </ProtectedRoute>
  );
}
