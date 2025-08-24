"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import api from "../../../lib/api";
import {
  AlertCircle,
  Clock,
  Loader2,
  MapPin,
  Calendar,
  CheckCircle,
  ArrowLeft,
  User,
  Tag,
  DollarSign,
} from "lucide-react";

interface Issue {
  _id: string;
  title: string;
  description: string;
  status: "open" | "assigned" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  estimatedCost?: number;
  location?: {
    address: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  consumer?: {
    _id: string;
    name: string;
    email: string;
  };
  assignedProvider?: {
    _id: string;
    name: string;
    email: string;
  };
  category?: {
    _id: string;
    name: string;
    description: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ProviderIssuesPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingIssue, setUpdatingIssue] = useState<string | null>(null);

  // Price proposal modal state
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [proposedPrice, setProposedPrice] = useState<number>(0);

  const fetchProviderIssues = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all available issues for providers (open/unassigned and in_progress issues assigned to this provider)
      const response = await api.get("/api/issues", {
        params: {
          limit: 50,
        },
      });

      if (response.data.success) {
        setIssues(response.data.data);
      }
    } catch (err: any) {
      console.error("Error fetching provider issues:", err);
      setError(err.response?.data?.message || "Failed to load issues");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptIssue = async (issue: Issue) => {
    setSelectedIssue(issue);
    setProposedPrice(issue.estimatedCost || 0);
    setShowPriceModal(true);
  };

  const handleSubmitPriceProposal = async () => {
    if (!selectedIssue) return;

    if (proposedPrice <= 0) {
      alert("Please enter a valid price");
      return;
    }

    try {
      setUpdatingIssue(selectedIssue._id);

      // Use the dedicated accept endpoint
      const response = await api.post(
        `/api/issues/${selectedIssue._id}/accept`
      );

      if (response.data.success) {
        const acceptedIssue = response.data.data;

        // Update the estimated cost separately if needed and if the issue is now assigned to this provider
        if (
          proposedPrice !== selectedIssue.estimatedCost &&
          acceptedIssue.assignedProvider._id
        ) {
          try {
            await api.patch(`/api/issues/${selectedIssue._id}`, {
              estimatedCost: proposedPrice,
            });
          } catch (updateError) {
            console.warn("Could not update estimated cost:", updateError);
            // Don't fail the whole operation if this update fails
          }
        }

        // Refresh the issues list
        await fetchProviderIssues();
        setShowPriceModal(false);
        setSelectedIssue(null);
        setProposedPrice(0);
        alert("Issue accepted successfully!");
      }
    } catch (err: any) {
      console.error("Error accepting issue:", err);
      alert(err.response?.data?.message || "Failed to accept issue");
    } finally {
      setUpdatingIssue(null);
    }
  };

  const handleResolveIssue = async (issueId: string) => {
    try {
      setUpdatingIssue(issueId);

      const response = await api.post(`/api/issues/${issueId}/resolve`);

      if (response.data.success) {
        // Refresh the issues list
        await fetchProviderIssues();
        alert("Issue resolved successfully!");
      }
    } catch (err: any) {
      console.error("Error resolving issue:", err);
      alert(err.response?.data?.message || "Failed to resolve issue");
    } finally {
      setUpdatingIssue(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-600 bg-red-100";
      case "high":
        return "text-orange-600 bg-orange-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "text-blue-600 bg-blue-100";
      case "assigned":
        return "text-purple-600 bg-purple-100";
      case "in_progress":
        return "text-orange-600 bg-orange-100";
      case "resolved":
        return "text-green-600 bg-green-100";
      case "closed":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  useEffect(() => {
    fetchProviderIssues();
  }, []);

  if (loading) {
    return (
      <ProtectedRoute requiredRole="provider" fallbackPath="/login">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-600 dark:text-gray-300">
              Loading issues...
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
                onClick={fetchProviderIssues}
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
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/provider-dashboard")}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Dashboard</span>
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                    <AlertCircle className="h-8 w-8 text-red-600 mr-3" />
                    Available Issues
                  </h1>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    Issues available for you to handle
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Issues List */}
          {issues.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent className="">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Issues Available
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  There are currently no issues available for you to handle.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {issues.map((issue) => (
                <Card
                  key={issue._id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                          {issue.title}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {issue.description}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                            issue.priority
                          )}`}
                        >
                          {issue.priority.toUpperCase()}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            issue.status
                          )}`}
                        >
                          {issue.status.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{issue.consumer?.name || "Unknown User"}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">
                          {issue.location?.address || "Location not specified"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Tag className="h-4 w-4" />
                        <span>{issue.category?.name || "Uncategorized"}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(issue.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">
                          {issue.estimatedCost
                            ? `₹${issue.estimatedCost.toLocaleString()}`
                            : "Price not set"}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      {issue.status === "open" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleAcceptIssue(issue)}
                          disabled={updatingIssue === issue._id}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {updatingIssue === issue._id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Accepting...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Accept Issue
                            </>
                          )}
                        </Button>
                      )}

                      {(issue.status === "assigned" ||
                        issue.status === "in_progress") && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleResolveIssue(issue._id)}
                          disabled={updatingIssue === issue._id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {updatingIssue === issue._id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Resolving...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Resolved
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Price Proposal Modal */}
        <Dialog open={showPriceModal} onOpenChange={setShowPriceModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Propose Your Price</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedIssue?.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {selectedIssue?.description?.slice(0, 100)}...
                </p>
              </div>

              {selectedIssue?.estimatedCost && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Current estimated cost: ₹
                    {selectedIssue.estimatedCost.toLocaleString()}
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="proposedPrice"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Your Proposed Price (₹)
                </label>
                <Input
                  id="proposedPrice"
                  type="number"
                  min="1"
                  value={proposedPrice}
                  onChange={(e) => setProposedPrice(Number(e.target.value))}
                  placeholder="Enter your price"
                  className="w-full"
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => {
                    setShowPriceModal(false);
                    setSelectedIssue(null);
                    setProposedPrice(0);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="default"
                  onClick={handleSubmitPriceProposal}
                  disabled={
                    proposedPrice <= 0 || updatingIssue === selectedIssue?._id
                  }
                  className="flex-1"
                >
                  {updatingIssue === selectedIssue?._id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Accept for ₹{proposedPrice.toLocaleString()}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
