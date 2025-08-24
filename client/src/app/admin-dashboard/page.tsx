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
import api, { dashboardAPI, adminAPI } from "../../lib/api";
import {
  Users,
  FileText,
  Calendar,
  Loader2,
  AlertCircle,
  TrendingUp,
  Shield,
  CheckCircle,
  Clock,
  Star,
} from "lucide-react";

interface AdminDashboardStats {
  totalUsers: number;
  totalConsumers: number;
  totalProviders: number;
  verifiedProviders: number;
  totalIssues: number;
  openIssues: number;
  inProgressIssues: number;
  resolvedIssues: number;
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  totalServices: number;
  activeServices: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats>({
    totalUsers: 0,
    totalConsumers: 0,
    totalProviders: 0,
    verifiedProviders: 0,
    totalIssues: 0,
    openIssues: 0,
    inProgressIssues: 0,
    resolvedIssues: 0,
    totalBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    totalServices: 0,
    activeServices: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the new admin API for more comprehensive stats
      const adminStats = await adminAPI.getSystemStats();
      setStats(adminStats);
    } catch (err: any) {
      console.error("Error fetching admin stats:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load admin dashboard statistics"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  if (loading) {
    return (
      <ProtectedRoute requiredRole="admin" fallbackPath="/login">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-600 dark:text-gray-300">
              Loading admin dashboard...
            </span>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredRole="admin" fallbackPath="/login">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">{error}</p>
              <button
                onClick={fetchAdminStats}
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
    <ProtectedRoute requiredRole="admin" fallbackPath="/login">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              Admin Dashboard
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              System overview and administrative controls
            </p>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Users Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent className="">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalUsers}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Consumers + Providers
                </p>
              </CardContent>
            </Card>

            {/* Total Issues Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Issues
                </CardTitle>
                <FileText className="h-4 w-4 text-orange-600" />
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

            {/* Verified Providers Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Verified Providers
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent className="">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.verifiedProviders}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Out of {stats.totalProviders} providers
                </p>
              </CardContent>
            </Card>

            {/* Open Issues Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Open Issues
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent className="">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.openIssues}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Require attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Stats Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Issues Breakdown */}
            <Card className="">
              <CardHeader className="">
                <CardTitle className="">Issues Breakdown</CardTitle>
                <CardDescription className="">
                  Current status of all issues
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

            {/* User Statistics */}
            <Card className="">
              <CardHeader className="">
                <CardTitle className="">User Statistics</CardTitle>
                <CardDescription className="">
                  Platform user distribution
                </CardDescription>
              </CardHeader>
              <CardContent className="">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Consumers</span>
                    </div>
                    <span className="font-medium">{stats.totalConsumers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-purple-600" />
                      <span className="text-sm">Providers</span>
                    </div>
                    <span className="font-medium">{stats.totalProviders}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Verified</span>
                    </div>
                    <span className="font-medium">
                      {stats.verifiedProviders}
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
                  Administrative tools and controls
                </CardDescription>
              </CardHeader>
              <CardContent className="">
                <div className="space-y-2">
                  <button className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Manage Users</span>
                    </div>
                  </button>
                  <button className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Verify Providers</span>
                    </div>
                  </button>
                  <button className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-orange-600" />
                      <span className="font-medium">Review Issues</span>
                    </div>
                  </button>
                  <button className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">Analytics</span>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="">
            <CardHeader className="">
              <CardTitle className="">System Activity</CardTitle>
              <CardDescription className="">
                Recent platform activities and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      System Overview Updated
                    </p>
                    <p className="text-xs text-gray-500">
                      {stats.totalUsers} users, {stats.totalIssues} issues
                      tracked
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">Now</span>
                </div>

                {stats.openIssues > 0 && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Issues Requiring Attention
                      </p>
                      <p className="text-xs text-gray-500">
                        {stats.openIssues} open issues need review
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">Ongoing</span>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Provider Verification Status
                    </p>
                    <p className="text-xs text-gray-500">
                      {stats.verifiedProviders} out of {stats.totalProviders}{" "}
                      providers verified
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
