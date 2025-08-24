"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Search,
  MapPin,
  List,
  Plus,
  Filter,
  Loader2,
  AlertCircle,
} from "lucide-react";
import IssuesMap from "../map/IssuesMap";
import IssueReportMap from "../map/IssueReportMap";
import { issuesAPI, categoriesAPI } from "../../lib/api";
import type { Issue } from "../../types";

const IssuesWithMap: React.FC = () => {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [viewMode, setViewMode] = useState<"list" | "map" | "report">("list");

  useEffect(() => {
    fetchIssues();
    fetchCategories();
    getUserLocation();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await issuesAPI.getIssues({
        category: selectedCategory,
        status: selectedStatus,
      });
      setIssues(response.data || []);
    } catch (error) {
      console.error("Error fetching issues:", error);
      setError("Failed to load issues");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchIssues();
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, selectedCategory, selectedStatus]);

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory ||
      (typeof issue.category === "string"
        ? issue.category === selectedCategory
        : issue.category?.name === selectedCategory);
    const matchesStatus = !selectedStatus || issue.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleIssueSelect = (issue: Issue) => {
    // Navigate to issue details page
    router.push(`/forum/issue/${issue._id || issue.id}`);
  };

  const handleUpvote = async (issue: Issue, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click

    try {
      const response = await issuesAPI.upvoteIssue(issue._id || issue.id);
      if (response.success) {
        // Update the issue in the local state
        setIssues((prevIssues) =>
          prevIssues.map((prevIssue) =>
            (prevIssue._id || prevIssue.id) === (issue._id || issue.id)
              ? {
                  ...prevIssue,
                  upvotes: response.data.upvotes,
                  upvotedBy: response.data.hasUpvoted
                    ? [...(prevIssue.upvotedBy || []), "current-user"]
                    : (prevIssue.upvotedBy || []).filter(
                        (id) => id !== "current-user"
                      ),
                }
              : prevIssue
          )
        );
      }
    } catch (error: any) {
      console.error("Error upvoting issue:", error);
      alert(error.response?.data?.message || "Failed to upvote issue");
    }
  };

  const handleIssueSubmitted = (issue: any) => {
    // Refresh issues list after new issue is submitted
    fetchIssues();
    setViewMode("list"); // Switch back to list view
  };

  const IssueCard: React.FC<{ issue: Issue }> = ({ issue }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case "open":
          return "bg-red-100 text-red-800";
        case "in_progress":
          return "bg-yellow-100 text-yellow-800";
        case "resolved":
          return "bg-green-100 text-green-800";
        case "rejected":
          return "bg-gray-100 text-gray-800";
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
          return "bg-gray-100 text-gray-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{issue.title}</CardTitle>
              <p className="text-sm text-blue-600 font-medium mt-1">
                {typeof issue.category === "string"
                  ? issue.category
                  : issue.category?.name}
              </p>
            </div>
            <div className="flex flex-col space-y-1">
              <span
                className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                  issue.status
                )}`}
              >
                {issue.status.replace("_", " ").toUpperCase()}
              </span>
              <span
                className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(
                  issue.priority
                )}`}
              >
                {issue.priority.toUpperCase()}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="">
          <p className="text-gray-600 mb-4">{issue.description}</p>

          <div className="space-y-2 text-sm text-gray-500">
            {issue.location?.address && (
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{issue.location.address}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
              <span>� {issue.viewsCount || 0} views</span>
            </div>
          </div>

          <div className="mt-4 flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className=""
              onClick={() => handleIssueSelect(issue)}
            >
              View Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              className=""
              onClick={(e) => handleUpvote(issue, e)}
            >
              👍 {issue.upvotes || 0}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading issues...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Community Issues
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Report and track urban infrastructure issues in your area
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                className="pl-10"
                placeholder="Search issues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>

            <div className="flex space-x-1">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                className="flex items-center space-x-1"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
                <span>List</span>
              </Button>
              <Button
                variant={viewMode === "map" ? "default" : "outline"}
                size="sm"
                className="flex items-center space-x-1"
                onClick={() => setViewMode("map")}
              >
                <MapPin className="w-4 h-4" />
                <span>Map</span>
              </Button>
            </div>

            <Button
              variant={viewMode === "report" ? "default" : "outline"}
              size="sm"
              className="flex items-center space-x-1"
              onClick={() => setViewMode("report")}
            >
              <Plus className="w-4 h-4" />
              <span>Report Issue</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {viewMode === "report" ? (
        <IssueReportMap
          onIssueSubmitted={handleIssueSubmitted}
          initialLocation={userLocation || undefined}
        />
      ) : viewMode === "map" ? (
        <IssuesMap
          issues={filteredIssues}
          onIssueSelect={handleIssueSelect}
          userLocation={userLocation || undefined}
          height="600px"
        />
      ) : filteredIssues.length === 0 ? (
        <Card className="">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No issues found
            </h3>
            <p className="text-gray-500">
              Try adjusting your search criteria or report a new issue
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIssues.map((issue) => (
            <IssueCard key={issue._id || issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
};

export default IssuesWithMap;
