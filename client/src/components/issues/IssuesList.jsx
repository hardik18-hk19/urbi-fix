"use client";

import React, { useState, useEffect } from "react";
import { issuesAPI } from "../../lib/api";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { useUserStore } from "../../store/userStore";

const IssueCard = ({ issue, onUpvote, user }) => {
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [upvotes, setUpvotes] = useState(issue.upvotes || 0);
  const [hasUpvoted, setHasUpvoted] = useState(
    issue.upvotedBy?.includes(user?.id) || false
  );

  const handleUpvote = async () => {
    if (!user) return;

    setIsUpvoting(true);
    try {
      const response = await issuesAPI.upvoteIssue(issue._id || issue.id);
      if (response.success) {
        setUpvotes(response.data.upvotes);
        setHasUpvoted(response.data.hasUpvoted);
        if (onUpvote) {
          onUpvote(issue._id || issue.id, response.data);
        }
      }
    } catch (error) {
      console.error("Error upvoting issue:", error);
    } finally {
      setIsUpvoting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      open: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      resolved: "bg-green-100 text-green-800",
      closed: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          statusColors[status] || statusColors.open
        }`}
      >
        {status?.replace("_", " ").toUpperCase() || "OPEN"}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityColors = {
      low: "bg-gray-100 text-gray-800",
      medium: "bg-blue-100 text-blue-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          priorityColors[priority] || priorityColors.medium
        }`}
      >
        {priority?.toUpperCase() || "MEDIUM"}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">{issue.title}</h3>
          <p className="text-gray-600 mb-3">{issue.description}</p>
        </div>

        {/* Upvote Button */}
        <div className="flex flex-col items-center ml-4">
          <Button
            onClick={handleUpvote}
            disabled={isUpvoting || !user}
            variant={hasUpvoted ? "default" : "outline"}
            size="sm"
            className="mb-1"
          >
            {hasUpvoted ? "👍" : "👍"} {upvotes}
          </Button>
        </div>
      </div>

      {/* Issue Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500">Status</p>
          {getStatusBadge(issue.status)}
        </div>
        <div>
          <p className="text-sm text-gray-500">Priority</p>
          {getPriorityBadge(issue.priority)}
        </div>
        <div>
          <p className="text-sm text-gray-500">Category</p>
          <p className="font-medium">
            {issue.category?.name || issue.category || "Unknown"}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Reported by</p>
          <p className="font-medium">
            {issue.consumer?.name || issue.reportedByUser?.name || "Anonymous"}
          </p>
        </div>
      </div>

      {/* Location */}
      {issue.location && (
        <div className="mb-4">
          <p className="text-sm text-gray-500">Location</p>
          <p className="font-medium">{issue.location.address}</p>
          {issue.location.coordinates && (
            <p className="text-xs text-gray-400">
              📍 {issue.location.coordinates.latitude?.toFixed(6)},{" "}
              {issue.location.coordinates.longitude?.toFixed(6)}
            </p>
          )}
        </div>
      )}

      {/* Images */}
      {issue.images && issue.images.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">Images</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {issue.images.slice(0, 4).map((imageUrl, index) => (
              <div key={index} className="relative">
                <img
                  src={imageUrl}
                  alt={`Issue image ${index + 1}`}
                  className="w-full h-20 object-cover rounded-md border"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            ))}
            {issue.images.length > 4 && (
              <div className="flex items-center justify-center h-20 bg-gray-100 rounded-md border">
                <span className="text-sm text-gray-500">
                  +{issue.images.length - 4} more
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estimated Cost */}
      {issue.estimatedCost && (
        <div className="mb-4">
          <p className="text-sm text-gray-500">Estimated Cost</p>
          <p className="font-medium">₹{issue.estimatedCost.toLocaleString()}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t">
        <span>Reported on {formatDate(issue.createdAt)}</span>
        {issue.updatedAt !== issue.createdAt && (
          <span>Updated on {formatDate(issue.updatedAt)}</span>
        )}
      </div>
    </Card>
  );
};

const IssuesList = ({ showUserIssuesOnly = false, onIssueSelect }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [filters, setFilters] = useState({
    status: "",
    category: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const { user } = useUserStore();

  useEffect(() => {
    fetchIssues();
  }, [pagination.page, filters, showUserIssuesOnly]);

  const fetchIssues = async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };

      // Remove empty filters
      Object.keys(params).forEach((key) => {
        if (params[key] === "") {
          delete params[key];
        }
      });

      const response = await issuesAPI.getIssues(params);

      if (response.success) {
        setIssues(response.data);
        setPagination(response.pagination);
      } else {
        setError("Failed to fetch issues");
      }
    } catch (error) {
      console.error("Error fetching issues:", error);
      setError(error.response?.data?.message || "Failed to fetch issues");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters((prev) => ({ ...prev, [filterKey]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleUpvote = (issueId, upvoteData) => {
    setIssues((prev) =>
      prev.map((issue) =>
        (issue._id || issue.id) === issueId
          ? {
              ...issue,
              upvotes: upvoteData.upvotes,
              upvotedBy: upvoteData.hasUpvoted
                ? [...(issue.upvotedBy || []), user.id]
                : (issue.upvotedBy || []).filter((id) => id !== user.id),
            }
          : issue
      )
    );
  };

  if (!user) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-600">
          Please log in to view issues.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <h2 className="text-2xl font-bold">
          {showUserIssuesOnly ? "My Issues" : "All Issues"}
        </h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange("sortBy", e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="createdAt">Date</option>
            <option value="upvotes">Upvotes</option>
            <option value="priority">Priority</option>
            <option value="title">Title</option>
          </select>

          <select
            value={filters.sortOrder}
            onChange={(e) => handleFilterChange("sortOrder", e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-6">
          <div className="text-center text-red-600">
            <p>{error}</p>
            <Button onClick={fetchIssues} variant="outline" className="mt-2">
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {/* Issues List */}
      {!loading && !error && (
        <>
          {issues.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-gray-600">
                {showUserIssuesOnly
                  ? "You haven't reported any issues yet."
                  : "No issues found."}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {issues.map((issue) => (
                <IssueCard
                  key={issue._id || issue.id}
                  issue={issue}
                  onUpvote={handleUpvote}
                  user={user}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 mt-8">
              <Button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrevPage}
                variant="outline"
              >
                Previous
              </Button>

              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}(
                {pagination.total} total issues)
              </span>

              <Button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default IssuesList;
