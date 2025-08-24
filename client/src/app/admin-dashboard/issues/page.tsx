"use client";

import React, { useState, useEffect } from "react";
import { issuesAPI } from "../../../lib/api";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { useUserStore } from "../../../store/userStore";

const AdminIssues = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    category: "",
    priority: "",
    sortBy: "createdAt",
    sortOrder: "desc" as "asc" | "desc",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const { user } = useUserStore();

  useEffect(() => {
    fetchIssues();
  }, [filters, pagination.page]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
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

  const handleFilterChange = (filterKey, value) => {
    setFilters((prev) => ({ ...prev, [filterKey]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const updateIssueStatus = async (issueId, newStatus) => {
    try {
      await issuesAPI.updateIssue(issueId, { status: newStatus });
      // Refresh the list
      fetchIssues();
    } catch (error) {
      console.error("Error updating issue status:", error);
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

  if (!user || user.role !== "admin") {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <p className="text-center text-red-600">
            Access denied. Admin privileges required.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">All Issues - Admin View</h1>
        <Button
          onClick={fetchIssues}
          variant="outline"
          size="default"
          className=""
        >
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            value={filters.priority}
            onChange={(e) => handleFilterChange("priority", e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
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

          <Button
            onClick={() => {
              setFilters({
                status: "",
                category: "",
                priority: "",
                sortBy: "createdAt",
                sortOrder: "desc",
              });
            }}
            variant="outline"
            size="default"
            className=""
          >
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Issues</h3>
          <p className="text-2xl font-bold">{pagination.total || 0}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Open Issues</h3>
          <p className="text-2xl font-bold text-blue-600">
            {issues.filter((issue) => issue.status === "open").length}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">In Progress</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {issues.filter((issue) => issue.status === "in_progress").length}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Resolved</h3>
          <p className="text-2xl font-bold text-green-600">
            {issues.filter((issue) => issue.status === "resolved").length}
          </p>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-6 mb-6">
          <div className="text-center text-red-600">
            <p>{error}</p>
            <Button
              onClick={fetchIssues}
              variant="outline"
              size="default"
              className="mt-2"
            >
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
              <p className="text-center text-gray-600">No issues found.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {issues.map((issue) => (
                <Card key={issue._id || issue.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">
                        {issue.title}
                      </h3>
                      <p className="text-gray-600 mb-3">{issue.description}</p>
                    </div>

                    {/* Admin Actions */}
                    <div className="flex flex-col space-y-2 ml-4">
                      <select
                        value={issue.status}
                        onChange={(e) =>
                          updateIssueStatus(
                            issue._id || issue.id,
                            e.target.value
                          )
                        }
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  {/* Issue Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      {getStatusBadge(issue.status)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Priority</p>
                      {getPriorityBadge(issue.priority)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Upvotes</p>
                      <p className="font-medium">👍 {issue.upvotes || 0}</p>
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
                        {issue.consumer?.name ||
                          issue.reportedByUser?.name ||
                          "Anonymous"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Assigned to</p>
                      <p className="font-medium">
                        {issue.assignedProvider?.name ||
                          issue.assignedProviderUser?.name ||
                          "Not assigned"}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  {issue.location && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{issue.location.address}</p>
                    </div>
                  )}

                  {/* Estimated Cost */}
                  {issue.estimatedCost && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500">Estimated Cost</p>
                      <p className="font-medium">
                        ₹{issue.estimatedCost.toLocaleString()}
                      </p>
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
                size="default"
                className=""
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
                size="default"
                className=""
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

export default AdminIssues;
