"use client";

import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { issuesAPI } from "../../lib/api";
import type { Issue } from "../../types";
import {
  Search,
  Filter,
  TrendingUp,
  MessageCircle,
  Eye,
  Heart,
  Clock,
  DollarSign,
  Users,
  ArrowRight,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import Link from "next/link";

export default function CommunityForumPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [filterStatus, setFilterStatus] = useState("");
  const router = useRouter();

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        sortBy,
        sortOrder: "desc",
      };

      if (filterStatus) params.status = filterStatus;

      const response = await issuesAPI.getIssues(params);
      let filteredIssues = response.data || [];

      // Client-side search filter
      if (searchTerm) {
        filteredIssues = filteredIssues.filter(
          (issue) =>
            issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            issue.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setIssues(filteredIssues);
    } catch (err: any) {
      console.error("Error fetching issues:", err);
      setError(
        err.response?.data?.message || "Failed to load community issues"
      );
    } finally {
      setLoading(false);
    }
  }, [sortBy, filterStatus, searchTerm]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "resolved":
        return "bg-gray-100 text-gray-800";
      case "closed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getCrowdfundingProgress = (issue: Issue) => {
    if (!issue.crowdfunding?.isEnabled) return null;

    const progress =
      issue.crowdfunding.targetAmount > 0
        ? (issue.crowdfunding.raisedAmount / issue.crowdfunding.targetAmount) *
          100
        : 0;

    return Math.min(progress, 100);
  };

  return (
    <ProtectedRoute
      requiredRole={["consumer", "provider", "admin"]}
      fallbackPath="/login"
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Community Forum
          </h1>
          <p className="text-gray-600">
            Discuss community issues, contribute to solutions, and help make
            your city better
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search issues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt">Latest</option>
              <option value="upvotes">Most Popular</option>
              <option value="commentsCount">Most Discussed</option>
              <option value="viewsCount">Most Viewed</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <Button
              onClick={fetchIssues}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Issues List */}
        {!loading && !error && (
          <div className="space-y-4">
            {issues.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium dark:text-gray-50 mb-2">
                  No issues found
                </h3>
                <p className="text-gray-600">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "Be the first to report an issue"}
                </p>
              </div>
            ) : (
              issues.map((issue) => (
                <div
                  key={issue._id}
                  className="bg-white dark:bg-gray-800 dark:text-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/forum/issue/${issue._id}`)}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getStatusColor(issue.status)}>
                          {issue.status.replace("_", " ").toUpperCase()}
                        </Badge>
                        <Badge className={getPriorityColor(issue.priority)}>
                          {issue.priority.toUpperCase()}
                        </Badge>
                        {issue.crowdfunding?.isEnabled && (
                          <Badge className="bg-purple-100 text-purple-800">
                            <DollarSign className="h-3 w-3 mr-1" />
                            CROWDFUNDED
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {issue.title}
                      </h3>

                      <p className="text-gray-600 line-clamp-2 mb-3">
                        {issue.description}
                      </p>

                      {/* Crowdfunding Progress */}
                      {issue.crowdfunding?.isEnabled && (
                        <div className="mb-3 p-3 bg-purple-50 rounded-lg">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">
                              Crowdfunding Progress
                            </span>
                            <span>
                              ₹
                              {issue.crowdfunding.raisedAmount.toLocaleString()}{" "}
                              / ₹
                              {issue.crowdfunding.targetAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{
                                width: `${getCrowdfundingProgress(issue)}%`,
                              }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-600 mt-1">
                            <span>
                              {getCrowdfundingProgress(issue)?.toFixed(1)}%
                              funded
                            </span>
                            <span>
                              {issue.crowdfunding.contributors.length}{" "}
                              contributors
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats and Metadata */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      {issue.upvotes}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      {issue.commentsCount || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {issue.viewsCount || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTimeAgo(issue.createdAt)}
                    </div>
                    {issue.location?.address && (
                      <div className="flex items-center gap-1">
                        <span>📍 {issue.location.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={() => router.push("/issues")}
            className="rounded-full shadow-lg"
            variant="default"
            size="lg"
          >
            Report Issue
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
