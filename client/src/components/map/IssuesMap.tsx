"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, Clock, CheckCircle, X, Filter } from "lucide-react";
import Map from "./Map";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { issuesAPI } from "../../lib/api";
import { createIssueIcon, createSimpleIcon } from "../../lib/leafletUtils";
import type { Issue } from "../../types";

interface IssuesMapProps {
  issues?: Issue[];
  onIssueSelect?: (issue: Issue) => void;
  userLocation?: [number, number];
  height?: string;
}

const IssuesMap: React.FC<IssuesMapProps> = ({
  issues = [],
  onIssueSelect,
  userLocation,
  height = "500px",
}) => {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    userLocation || [12.9716, 77.5946] // Default to Bangalore
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter issues based on status
  const filteredIssues = issues.filter((issue) => {
    if (statusFilter === "all") return true;
    return issue.status === statusFilter;
  });

  // Get icon and color based on issue status
  const getIssueStyle = (status: string, priority: string) => {
    const styles = {
      open: { color: "#ef4444", icon: "🔴" },
      in_progress: { color: "#f59e0b", icon: "🟡" },
      resolved: { color: "#10b981", icon: "🟢" },
      rejected: { color: "#6b7280", icon: "⚫" },
    };

    return styles[status as keyof typeof styles] || styles.open;
  };

  // Create markers for issues
  const markers = filteredIssues
    .filter((issue) => issue.location?.coordinates)
    .map((issue) => {
      const style = getIssueStyle(issue.status, issue.priority);
      return {
        id: issue._id || issue.id || "",
        position: [
          issue.location.coordinates.latitude,
          issue.location.coordinates.longitude,
        ] as [number, number],
        icon: createIssueIcon(issue.status),
        popup: (
          <Card className="w-80">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-medium">
                  {issue.title}
                </CardTitle>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    issue.status === "open"
                      ? "bg-red-100 text-red-800"
                      : issue.status === "in_progress"
                      ? "bg-yellow-100 text-yellow-800"
                      : issue.status === "resolved"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {issue.status.replace("_", " ").toUpperCase()}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <p className="text-xs text-gray-600 line-clamp-3">
                  {issue.description}
                </p>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">Category:</span>
                    <span className="bg-blue-100 text-blue-800 px-1 rounded">
                      {typeof issue.category === "string"
                        ? issue.category
                        : issue.category?.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">Priority:</span>
                    <span
                      className={`px-1 rounded ${
                        issue.priority === "urgent"
                          ? "bg-red-100 text-red-800"
                          : issue.priority === "high"
                          ? "bg-orange-100 text-orange-800"
                          : issue.priority === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {issue.priority}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>👍 {issue.upvotes || 0}</span>
                  </div>
                </div>

                {issue.location?.address && (
                  <div className="text-xs text-gray-500">
                    📍 {issue.location.address}
                  </div>
                )}

                <Button
                  variant="default"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => onIssueSelect?.(issue)}
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ),
      };
    });

  // Add user location marker if available
  if (userLocation) {
    markers.push({
      id: "user-location",
      position: userLocation,
      icon: createSimpleIcon("#1d4ed8"),
      popup: (
        <div className="p-2">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-sm font-medium">Your Location</span>
          </div>
        </div>
      ),
    });
  }

  const statusCounts = {
    all: issues.length,
    open: issues.filter((i) => i.status === "open").length,
    in_progress: issues.filter((i) => i.status === "in_progress").length,
    resolved: issues.filter((i) => i.status === "resolved").length,
    rejected: issues.filter((i) => i.status === "rejected").length,
  };

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Issues Map</h3>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All Issues ({statusCounts.all})</option>
            <option value="open">Open ({statusCounts.open})</option>
            <option value="in_progress">
              In Progress ({statusCounts.in_progress})
            </option>
            <option value="resolved">Resolved ({statusCounts.resolved})</option>
            <option value="rejected">Rejected ({statusCounts.rejected})</option>
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="dark:bg-black p-3 rounded-lg border">
        <h4 className="text-sm font-medium mb-2">Legend</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Open Issues</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Resolved</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span>Rejected</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Your Location</span>
          </div>
        </div>
      </div>

      <Map
        center={mapCenter}
        zoom={12}
        height={height}
        markers={markers}
        className="rounded-lg border"
      />

      {filteredIssues.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No issues found</p>
          {statusFilter !== "all" && (
            <p className="text-sm">Try changing the status filter</p>
          )}
        </div>
      )}
    </div>
  );
};

export default IssuesMap;
