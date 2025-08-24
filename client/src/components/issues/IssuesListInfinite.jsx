"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { issuesAPI } from "../../lib/api";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { useUserStore } from "../../store/userStore";
import useInfiniteScroll from "../../hooks/useInfiniteScroll";
import CrowdfundingModal from "./CrowdfundingModal";

const IssueCard = ({ issue, onUpvote, onIssueUpdate, user }) => {
  const router = useRouter();
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [upvotes, setUpvotes] = useState(issue.upvotes || 0);
  const [hasUpvoted, setHasUpvoted] = useState(
    issue.upvotedBy?.includes(user?.id) || false
  );
  const [showCrowdfundingModal, setShowCrowdfundingModal] = useState(false);

  // Check if current user owns this issue
  const isOwner =
    user?.id === (issue.consumer?.id || issue.consumer?._id || issue.consumer);

  const handleUpvote = async (e) => {
    e.stopPropagation(); // Prevent card click when upvoting

    if (!user) {
      alert("Please log in to upvote this issue");
      return;
    }

    setIsUpvoting(true);
    try {
      console.log("Upvoting issue:", issue._id || issue.id);
      const response = await issuesAPI.upvoteIssue(issue._id || issue.id);
      console.log("Upvote response:", response);

      if (response.success) {
        setUpvotes(response.data.upvotes);
        setHasUpvoted(response.data.hasUpvoted);
        if (onUpvote) {
          onUpvote(issue._id || issue.id, response.data);
        }
      }
    } catch (error) {
      console.error("Error upvoting issue:", error);
      console.error("Error details:", error.response?.data);
      alert(error.response?.data?.message || "Failed to upvote issue");
    } finally {
      setIsUpvoting(false);
    }
  };

  const handleViewDetails = (e) => {
    e.stopPropagation(); // Prevent card click
    router.push(`/forum/issue/${issue._id || issue.id}`);
  };

  const handleCardClick = () => {
    router.push(`/forum/issue/${issue._id || issue.id}`);
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
    <>
      <Card
        className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2 hover:text-blue-600 transition-colors">
              {issue.title}
            </h3>
            <p className="text-gray-600 mb-3 line-clamp-3">
              {issue.description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col items-center ml-4 gap-2">
            <Button
              onClick={handleUpvote}
              disabled={isUpvoting || !user}
              variant={hasUpvoted ? "default" : "outline"}
              size="sm"
              className="min-w-[70px]"
            >
              {isUpvoting ? "..." : hasUpvoted ? "👍" : "👍"} {upvotes}
            </Button>

            <Button
              onClick={handleViewDetails}
              variant="outline"
              size="sm"
              className="min-w-[70px] text-xs"
            >
              View Details
            </Button>

            {isOwner && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCrowdfundingModal(true);
                }}
                variant={issue.crowdfunding?.isEnabled ? "default" : "outline"}
                size="sm"
                className="min-w-[70px] text-xs"
              >
                💰 {issue.crowdfunding?.isEnabled ? "Manage" : "Fund"}
              </Button>
            )}
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
              {issue.consumer?.name ||
                issue.reportedByUser?.name ||
                "Anonymous"}
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
            <p className="font-medium">
              ₹{issue.estimatedCost.toLocaleString()}
            </p>
          </div>
        )}

        {/* Crowdfunding Progress */}
        {issue.crowdfunding?.isEnabled && (
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-700">
                💰 Crowdfunding Active
              </p>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {issue.crowdfunding.contributors?.length || 0} contributors
              </span>
            </div>

            <div className="mb-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">
                  ₹{(issue.crowdfunding.raisedAmount || 0).toLocaleString()}{" "}
                  raised
                </span>
                <span className="text-gray-600">
                  Goal: ₹
                  {(issue.crowdfunding.targetAmount || 0).toLocaleString()}
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      issue.crowdfunding.targetAmount > 0
                        ? (issue.crowdfunding.raisedAmount /
                            issue.crowdfunding.targetAmount) *
                            100
                        : 0,
                      100
                    )}%`,
                  }}
                ></div>
              </div>

              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-blue-600 font-medium">
                  {issue.crowdfunding.targetAmount > 0
                    ? Math.min(
                        (issue.crowdfunding.raisedAmount /
                          issue.crowdfunding.targetAmount) *
                          100,
                        100
                      ).toFixed(1)
                    : 0}
                  % complete
                </span>
                {issue.crowdfunding.deadline && (
                  <span className="text-xs text-gray-500">
                    Ends:{" "}
                    {new Date(issue.crowdfunding.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t">
          <div className="flex items-center gap-4">
            <span>📅 {formatDate(issue.createdAt)}</span>
            <span>👀 {issue.viewsCount || 0} views</span>
            <span>💬 {issue.commentsCount || 0} comments</span>
          </div>
          {issue.updatedAt !== issue.createdAt && (
            <span>Updated {formatDate(issue.updatedAt)}</span>
          )}
        </div>
      </Card>

      <CrowdfundingModal
        isOpen={showCrowdfundingModal}
        onClose={() => setShowCrowdfundingModal(false)}
        issue={issue}
        onSuccess={(updatedIssue) => {
          if (onIssueUpdate) {
            onIssueUpdate(issue._id || issue.id, updatedIssue);
          }
          setShowCrowdfundingModal(false);
        }}
      />
    </>
  );
};

const IssuesListInfinite = ({
  showUserIssuesOnly = false,
  useInfiniteScrolling = true,
}) => {
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
    crowdfunding: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const { user } = useUserStore();

  const fetchIssues = useCallback(
    async (page = 1, append = false) => {
      if (!append) {
        setLoading(true);
      }
      setError("");

      try {
        const params = {
          page,
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
          if (append) {
            setIssues((prev) => [...prev, ...response.data]);
          } else {
            setIssues(response.data);
          }
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
    },
    [filters, pagination.limit]
  );

  const fetchMoreIssues = useCallback(async () => {
    if (pagination.hasNextPage && !loading) {
      await fetchIssues(pagination.page + 1, true);
    }
  }, [fetchIssues, pagination.hasNextPage, pagination.page, loading]);

  const [isFetching] = useInfiniteScroll(
    fetchMoreIssues,
    pagination.hasNextPage,
    loading
  );

  useEffect(() => {
    fetchIssues(1, false);
  }, [filters, showUserIssuesOnly]);

  const handleFilterChange = (filterKey, value) => {
    setFilters((prev) => ({ ...prev, [filterKey]: value }));
    setIssues([]); // Clear current issues
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (newPage) => {
    fetchIssues(newPage, false);
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

  const handleIssueUpdate = (issueId, updatedIssue) => {
    setIssues((prev) =>
      prev.map((issue) =>
        (issue._id || issue.id) === issueId ? updatedIssue : issue
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
            value={filters.crowdfunding}
            onChange={(e) => handleFilterChange("crowdfunding", e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Issues</option>
            <option value="enabled">With Crowdfunding</option>
            <option value="disabled">Without Crowdfunding</option>
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
            <option value="crowdfunding.raisedAmount">Funding Progress</option>
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
      {loading && issues.length === 0 && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-6">
          <div className="text-center text-red-600">
            <p>{error}</p>
            <Button
              onClick={() => fetchIssues(1, false)}
              variant="outline"
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {/* Issues List */}
      {!error && (
        <>
          {issues.length === 0 && !loading ? (
            <Card className="p-6">
              <p className="text-center text-gray-600">
                {showUserIssuesOnly
                  ? "You haven't reported any issues yet."
                  : "No issues found."}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {issues.map((issue, index) => (
                <IssueCard
                  key={`${issue._id || issue.id}-${index}`}
                  issue={issue}
                  onUpvote={handleUpvote}
                  onIssueUpdate={handleIssueUpdate}
                  user={user}
                />
              ))}
            </div>
          )}

          {/* Loading more indicator */}
          {isFetching && (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading more issues...</span>
            </div>
          )}

          {/* Traditional Pagination (fallback if infinite scroll is disabled) */}
          {!useInfiniteScrolling && pagination.totalPages > 1 && (
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

          {/* End of results indicator */}
          {useInfiniteScrolling &&
            !pagination.hasNextPage &&
            issues.length > 0 && (
              <div className="text-center py-4 text-gray-500">
                <p>You've reached the end of the list</p>
                <p className="text-sm">Total: {pagination.total} issues</p>
              </div>
            )}
        </>
      )}
    </div>
  );
};

export default IssuesListInfinite;
