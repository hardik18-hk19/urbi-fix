"use client";

import React, { useState, useEffect } from "react";
import { dashboardAPI } from "../../../lib/api";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { useUserStore } from "../../../store/userStore";
import ChatModal from "../../../components/chat/ChatModal";
import api from "../../../lib/api";
import { MessageCircle, FileText } from "lucide-react";

const ConsumerBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showProposals, setShowProposals] = useState(false);
  const [selectedBookingForProposals, setSelectedBookingForProposals] =
    useState(null);
  const [proposals, setProposals] = useState([]);
  const { user } = useUserStore();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getBookings();
      setBookings(response.data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setError("Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      negotiating: "bg-orange-100 text-orange-800",
      confirmed: "bg-blue-100 text-blue-800",
      in_progress: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      rejected: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          statusColors[status] || statusColors.pending
        }`}
      >
        {status?.replace("_", " ").toUpperCase() || "PENDING"}
      </span>
    );
  };

  const openChat = (bookingId) => {
    setSelectedBookingId(bookingId);
    setShowChat(true);
  };

  const closeChat = () => {
    setShowChat(false);
    setSelectedBookingId(null);
  };

  const viewProposals = async (bookingId) => {
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
    } catch (err) {
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
    proposalId,
    action,
    responseMessage
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
        await fetchBookings();
      }
    } catch (err) {
      console.error(`Error ${action}ing proposal:`, err);
      alert(err.response?.data?.message || `Failed to ${action} proposal`);
    }
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <Button
          onClick={fetchBookings}
          variant="outline"
          size="default"
          className=""
        >
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="p-6 mb-6">
          <div className="text-center text-red-600">
            <p>{error}</p>
            <Button
              onClick={fetchBookings}
              variant="outline"
              size="default"
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {bookings.length === 0 ? (
        <Card className="p-6">
          <div className="text-center text-gray-600">
            <p className="text-lg mb-4">
              You don&apos;t have any bookings yet.
            </p>
            <p>
              Start by finding services or reporting issues that need
              professional help.
            </p>
            <div className="mt-6 space-x-4">
              <Button
                onClick={() => (window.location.href = "/services")}
                variant="default"
                size="default"
                className=""
              >
                Find Services
              </Button>
              <Button
                onClick={() => (window.location.href = "/issues")}
                variant="outline"
                size="default"
                className=""
              >
                Report Issue
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id || booking._id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">
                    {booking.service?.name ||
                      booking.issue?.title ||
                      "Service Booking"}
                  </h3>
                  <p className="text-gray-600 mb-3">
                    {booking.service?.description ||
                      booking.issue?.description ||
                      "No description available"}
                  </p>
                </div>
                <div className="ml-4">{getStatusBadge(booking.status)}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Provider</p>
                  <p className="font-medium">
                    {booking.provider?.name || "Not assigned"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium">
                    {booking.service?.category || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Scheduled Date</p>
                  <p className="font-medium">
                    {booking.scheduledDate
                      ? formatDate(booking.scheduledDate)
                      : "Not scheduled"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Service Cost</p>
                  <p className="font-medium">
                    ₹
                    {booking.totalAmount?.toLocaleString() ||
                      booking.originalAmount?.toLocaleString() ||
                      booking.service?.price?.toLocaleString() ||
                      "TBD"}
                  </p>
                </div>
                {booking.negotiatedAmount &&
                  booking.negotiatedAmount !== booking.totalAmount && (
                    <div>
                      <p className="text-sm text-gray-500">Negotiated Price</p>
                      <p className="font-medium text-green-600">
                        ₹{booking.negotiatedAmount.toLocaleString()}
                      </p>
                    </div>
                  )}
                {booking.finalCost && (
                  <div>
                    <p className="text-sm text-gray-500">Final Cost</p>
                    <p className="font-medium">
                      ₹{booking.finalCost.toLocaleString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <p className="font-medium">
                    {booking.paymentStatus || "Pending"}
                  </p>
                </div>
              </div>

              {booking.issue?.location?.address && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">
                    {booking.issue.location.address}
                  </p>
                </div>
              )}

              {booking.providerNotes && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Provider Notes</p>
                  <p className="font-medium">{booking.providerNotes}</p>
                </div>
              )}

              <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t">
                <span>Booked on {formatDate(booking.createdAt)}</span>
                {booking.updatedAt !== booking.createdAt && (
                  <span>Updated on {formatDate(booking.updatedAt)}</span>
                )}
              </div>

              <div className="mt-4 pt-4 border-t flex gap-2">
                {(booking.status === "pending" ||
                  booking.status === "negotiating" ||
                  booking.status === "confirmed" ||
                  booking.status === "in_progress") && (
                  <>
                    {booking.status === "negotiating" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewProposals(booking._id || booking.id)}
                        className="flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        View Proposals
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openChat(booking._id || booking.id)}
                      className="flex items-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Chat with Provider
                    </Button>
                  </>
                )}
                {booking.status === "completed" && !booking.rating && (
                  <Button variant="outline" size="sm" className="">
                    Rate Service
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Chat Modal */}
      {showChat && selectedBookingId && user && (
        <ChatModal
          isOpen={showChat}
          onClose={closeChat}
          bookingId={selectedBookingId}
          currentUserId={user.id}
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
                      <div className="p-4">
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
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumerBookings;
