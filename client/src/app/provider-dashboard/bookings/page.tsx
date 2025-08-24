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
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import api from "../../../lib/api";
import ChatModal from "../../../components/chat/ChatModal";
import { useUserStore } from "../../../store/userStore";
import {
  Calendar,
  Clock,
  Loader2,
  MapPin,
  DollarSign,
  ArrowLeft,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageCircle,
  FileText,
} from "lucide-react";

interface Booking {
  _id: string;
  issue?: {
    _id: string;
    title: string;
    description: string;
    location: {
      address: string;
    };
  };
  consumer?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  provider?: {
    _id: string;
    name: string;
    email: string;
  };
  service?: {
    _id: string;
    name: string;
    description: string;
    price: number;
  };
  scheduledDate: string;
  status:
    | "pending"
    | "negotiating"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "rejected";
  totalAmount: number;
  originalAmount: number;
  negotiatedAmount?: number;
  negotiationData?: {
    isNegotiated: boolean;
    priceHistory?: Array<{
      amount: number;
      proposedBy: string;
      proposedAt: string;
      message?: string;
    }>;
  };
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProviderBookingsPage() {
  const router = useRouter();
  const { user } = useUserStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null
  );
  const [showChat, setShowChat] = useState(false);
  const [showProposals, setShowProposals] = useState(false);
  const [selectedBookingForProposals, setSelectedBookingForProposals] =
    useState<string | null>(null);
  const [proposals, setProposals] = useState<any[]>([]);

  const fetchProviderBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch bookings for the provider
      const response = await api.get("/api/bookings", {
        params: {
          status: "pending,negotiating,confirmed,in_progress", // Include negotiating status
          limit: 50,
        },
      });

      if (response.data.success) {
        setBookings(response.data.data);
      }
    } catch (err: any) {
      console.error("Error fetching provider bookings:", err);
      setError(err.response?.data?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
    try {
      setUpdatingBooking(bookingId);

      const response = await api.patch(`/api/bookings/${bookingId}`, {
        status: "confirmed",
      });

      if (response.data.success) {
        // Refresh the bookings list
        await fetchProviderBookings();
      }
    } catch (err: any) {
      console.error("Error accepting booking:", err);
      alert(err.response?.data?.message || "Failed to accept booking");
    } finally {
      setUpdatingBooking(null);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    try {
      setUpdatingBooking(bookingId);

      const response = await api.patch(`/api/bookings/${bookingId}`, {
        status: "cancelled",
      });

      if (response.data.success) {
        // Refresh the bookings list
        await fetchProviderBookings();
      }
    } catch (err: any) {
      console.error("Error rejecting booking:", err);
      alert(err.response?.data?.message || "Failed to reject booking");
    } finally {
      setUpdatingBooking(null);
    }
  };

  const openChat = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setShowChat(true);
  };

  const closeChat = () => {
    setShowChat(false);
    setSelectedBookingId(null);
  };

  const viewProposals = async (bookingId: string) => {
    try {
      setSelectedBookingForProposals(bookingId);

      // Fetch proposals for this booking
      const response = await api.get(`/api/proposals/booking/${bookingId}`);

      if (response.data.success) {
        setProposals(response.data.data || []);
        setShowProposals(true);
      } else {
        alert("Failed to load proposals");
      }
    } catch (err: any) {
      console.error("Error fetching proposals:", err);
      alert(err.response?.data?.message || "Failed to load proposals");
    }
  };

  const closeProposals = () => {
    setShowProposals(false);
    setSelectedBookingForProposals(null);
    setProposals([]);
  };

  const handleProposalResponse = async (
    proposalId: string,
    action: string,
    responseMessage?: string
  ) => {
    try {
      const response = await api.post(`/api/proposals/${proposalId}/respond`, {
        action,
        responseMessage,
      });

      if (response.data.success) {
        alert(`Proposal ${action}ed successfully!`);
        // Refresh proposals and bookings
        if (selectedBookingForProposals) {
          await viewProposals(selectedBookingForProposals);
        }
        await fetchProviderBookings();
      }
    } catch (err: any) {
      console.error(`Error ${action}ing proposal:`, err);
      alert(err.response?.data?.message || `Failed to ${action} proposal`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "negotiating":
        return "text-orange-600 bg-orange-100";
      case "confirmed":
        return "text-green-600 bg-green-100";
      case "in_progress":
        return "text-blue-600 bg-blue-100";
      case "completed":
        return "text-purple-600 bg-purple-100";
      case "cancelled":
        return "text-red-600 bg-red-100";
      case "rejected":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "paid":
        return "text-green-600 bg-green-100";
      case "failed":
        return "text-red-600 bg-red-100";
      case "refunded":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  useEffect(() => {
    fetchProviderBookings();
  }, []);

  if (loading) {
    return (
      <ProtectedRoute requiredRole="provider" fallbackPath="/login">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-600 dark:text-gray-300">
              Loading bookings...
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
                onClick={fetchProviderBookings}
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
                    <Calendar className="h-8 w-8 text-blue-600 mr-3" />
                    Pending Bookings
                  </h1>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    Manage your pending and active bookings
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bookings List */}
          {bookings.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent className="">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Pending Bookings
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  You don&apos;t have any pending bookings at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {bookings.map((booking) => (
                <Card
                  key={booking._id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                          {booking.issue
                            ? booking.issue.title
                            : booking.service?.name || "Service Booking"}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {booking.issue
                            ? booking.issue.description
                            : booking.service?.description ||
                              "No description available"}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {booking.status.replace("_", " ").toUpperCase()}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(
                            booking.paymentStatus
                          )}`}
                        >
                          {booking.paymentStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <div>
                          <p className="font-medium">
                            {booking.consumer?.name || "Unknown Customer"}
                          </p>
                          <p className="text-xs">
                            {booking.consumer?.email || "No email"}
                          </p>
                          {booking.consumer?.phone && (
                            <p className="text-xs">{booking.consumer.phone}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">
                          {booking.issue?.location?.address ||
                            "Location not specified"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(booking.scheduledDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <DollarSign className="h-4 w-4" />
                        <div className="flex flex-col">
                          {booking.negotiatedAmount &&
                          booking.negotiationData?.isNegotiated ? (
                            <>
                              <span className="text-green-600 font-medium">
                                ₹{booking.negotiatedAmount.toLocaleString()}{" "}
                                (Negotiated)
                              </span>
                              <span className="text-gray-400 line-through text-xs">
                                Original: ₹
                                {(
                                  booking.originalAmount || booking.totalAmount
                                ).toLocaleString()}
                              </span>
                            </>
                          ) : (
                            <span>₹{booking.totalAmount.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        Service Details
                      </h4>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">
                          {booking.service?.name || "Unknown Service"}
                        </span>{" "}
                        -{" "}
                        {booking.service?.description ||
                          "No description available"}
                      </p>
                    </div>

                    {booking.notes && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          Notes
                        </h4>
                        <p className="text-sm text-gray-600">{booking.notes}</p>
                      </div>
                    )}

                    <div className="flex space-x-3">
                      {booking.status === "pending" && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleAcceptBooking(booking._id)}
                            disabled={updatingBooking === booking._id}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {updatingBooking === booking._id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Accepting...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Accept Booking
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectBooking(booking._id)}
                            disabled={updatingBooking === booking._id}
                            className="border-red-600 text-red-600 hover:bg-red-50"
                          >
                            {updatingBooking === booking._id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Rejecting...
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject Booking
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openChat(booking._id)}
                            className="flex items-center gap-2"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Chat
                          </Button>
                        </>
                      )}

                      {booking.status === "negotiating" && (
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2 text-orange-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Under Negotiation
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewProposals(booking._id)}
                            className="flex items-center gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            View Proposals
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openChat(booking._id)}
                            className="flex items-center gap-2"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Chat
                          </Button>
                        </div>
                      )}

                      {booking.status === "confirmed" && (
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Booking Confirmed
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openChat(booking._id)}
                            className="flex items-center gap-2"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Chat
                          </Button>
                        </div>
                      )}

                      {booking.status === "in_progress" && (
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-2 text-blue-600">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              In Progress
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openChat(booking._id)}
                            className="flex items-center gap-2"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Chat
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Modal */}
      {showChat && selectedBookingId && user && (
        <ChatModal
          isOpen={showChat}
          onClose={closeChat}
          bookingId={selectedBookingId}
          currentUserId={user.id}
          onBookingUpdate={fetchProviderBookings}
        />
      )}

      {/* Proposals Modal */}
      {showProposals && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Price Proposals</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeProposals}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>

              {proposals.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No proposals found for this booking.
                </p>
              ) : (
                <div className="space-y-4">
                  {proposals.map((proposal) => (
                    <Card key={proposal._id} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium text-sm">
                              {proposal.proposalType === "price"
                                ? "Price Proposal"
                                : proposal.proposalType}
                            </p>
                            <p className="text-sm text-gray-600">
                              From: {proposal.proposedBy?.name || "Unknown"}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              proposal.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : proposal.status === "accepted"
                                ? "bg-green-100 text-green-800"
                                : proposal.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {proposal.status?.toUpperCase()}
                          </span>
                        </div>

                        {proposal.proposedChanges?.price && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-green-600">
                              Proposed Price: ₹
                              {proposal.proposedChanges.price.toLocaleString()}
                            </p>
                          </div>
                        )}

                        {proposal.justification && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-700">
                              {proposal.justification}
                            </p>
                          </div>
                        )}

                        <div className="text-xs text-gray-500 mb-3">
                          Created:{" "}
                          {new Date(proposal.createdAt).toLocaleDateString()} at{" "}
                          {new Date(proposal.createdAt).toLocaleTimeString()}
                        </div>

                        {proposal.status === "pending" && (
                          <div className="flex space-x-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() =>
                                handleProposalResponse(
                                  proposal._id,
                                  "accept",
                                  "Proposal accepted"
                                )
                              }
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleProposalResponse(
                                  proposal._id,
                                  "reject",
                                  "Thank you for your proposal, but I cannot accept this price."
                                )
                              }
                              className="border-red-600 text-red-600 hover:bg-red-50"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
