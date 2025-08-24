"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useToast } from "../../contexts/ToastContext";
import { useUserStore } from "../../store/userStore";
import { bookingAPI, issuesAPI, proposalsAPI } from "../../lib/api";
import type { Service, Issue } from "../../types";
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  MapPin,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service | null;
  onBookingSuccess: (bookingId: string) => void;
}

export default function BookingModal({
  isOpen,
  onClose,
  service,
  onBookingSuccess,
}: BookingModalProps) {
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedIssue, setSelectedIssue] = useState("");
  const [userIssues, setUserIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposedPrice, setProposedPrice] = useState<number>(0);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const { addToast } = useToast();
  const { user, isAuthenticated } = useUserStore();

  // Calculate total amount (you can add service fees, taxes, etc. here)
  const calculateTotalAmount = () => {
    if (!service) return 0;
    if (isNegotiating && proposedPrice > 0) return proposedPrice;
    const basePrice = service?.price || 0;
    // Add any additional fees here
    return basePrice;
  };

  // Fetch user's issues when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUserIssues();
      // Reset form when modal opens
      setScheduledDate("");
      setScheduledTime("");
      setNotes("");
      setSelectedIssue("");
      setError(null);
      setProposedPrice(service?.price || 0);
      setIsNegotiating(false);
    }
  }, [isOpen, service?.price]);

  const fetchUserIssues = async () => {
    try {
      setLoadingIssues(true);
      const response = await issuesAPI.getIssues({
        status: "open", // Only fetch open issues
        limit: 50,
      });
      setUserIssues(response.data || []);
    } catch (err: any) {
      console.error("Error fetching issues:", err);
      // Don't set error for issues fetch as it's optional
    } finally {
      setLoadingIssues(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!service) return;

    // Check authentication
    if (!isAuthenticated || !user) {
      setError("You must be logged in to create a booking");
      addToast({
        type: "error",
        message: "Please log in to create a booking",
        duration: 5000,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!scheduledDate) {
        throw new Error("Please select a date for the service");
      }

      if (!scheduledTime) {
        throw new Error("Please select a time for the service");
      }

      if (isNegotiating && (!proposedPrice || proposedPrice <= 0)) {
        throw new Error("Please enter a valid proposed price");
      }

      // Combine date and time
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);

      // Check if the date is in the past
      if (scheduledDateTime < new Date()) {
        throw new Error("Please select a future date and time");
      }

      // First create the booking
      const bookingData = {
        service: service?.id || service?._id,
        provider:
          typeof service?.provider === "object"
            ? (service.provider as any)?.id || (service.provider as any)?._id
            : service?.provider,
        scheduledDate: scheduledDateTime.toISOString(),
        totalAmount: service?.price || 0, // Use original price for initial booking
        notes: notes.trim(),
        ...(selectedIssue && { issue: selectedIssue }),
      };

      const response = await bookingAPI.createBooking(bookingData);

      if (response.success) {
        const bookingId = response.data.id || (response.data as any)._id;

        // If user wants to negotiate price, create a proposal
        if (isNegotiating && proposedPrice !== (service?.price || 0)) {
          try {
            await proposalsAPI.createProposal({
              bookingId,
              proposalType: "price",
              proposedChanges: {
                price: proposedPrice,
                totalAmount: proposedPrice,
              },
              justification: `I would like to propose $${proposedPrice} for this service. ${
                notes ? `Additional notes: ${notes}` : ""
              }`,
            });

            addToast({
              type: "success",
              message: "Booking created and price proposal sent!",
              duration: 5000,
            });
          } catch (proposalError: any) {
            console.error("Error creating proposal:", proposalError);
            addToast({
              type: "warning",
              message: "Booking created but failed to send price proposal",
              duration: 5000,
            });
          }
        } else {
          addToast({
            type: "success",
            message: "Booking created successfully!",
            duration: 5000,
          });
        }

        onBookingSuccess(bookingId);
        onClose();
      } else {
        throw new Error(response.message || "Failed to create booking");
      }
    } catch (err: any) {
      console.error("Error creating booking:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to create booking";
      setError(errorMessage);
      addToast({
        type: "error",
        message: errorMessage,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Book Service
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service Summary */}
          <Card className="border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{service?.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-gray-600 dark:text-gray-300">
                {service?.description}
              </p>

              {service?.provider && typeof service.provider === "object" && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <User className="h-4 w-4 mr-2" />
                  <span>Provider: {service.provider?.name}</span>
                </div>
              )}

              <div className="flex items-center text-lg font-semibold text-green-600">
                <DollarSign className="h-5 w-5 mr-1" />
                <span>₹{(service?.price || 0).toLocaleString()}</span>
                {isNegotiating && (
                  <span className="text-blue-600 ml-2">
                    → ₹{proposedPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Price Negotiation Section */}
          <Card className="border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Pricing Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button
                  type="button"
                  variant={!isNegotiating ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsNegotiating(false)}
                  className="flex items-center"
                >
                  <span>Book at Listed Price</span>
                  <span className="ml-2 font-semibold">
                    ₹{(service?.price || 0).toLocaleString()}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant={isNegotiating ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsNegotiating(true)}
                  className="flex items-center"
                >
                  <span>Propose My Price</span>
                </Button>
              </div>

              {isNegotiating && (
                <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Your Proposed Price *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        type="number"
                        value={proposedPrice}
                        onChange={(e) =>
                          setProposedPrice(parseFloat(e.target.value) || 0)
                        }
                        placeholder="Enter your price"
                        className="pl-10"
                        min="1"
                        step="0.01"
                        required={isNegotiating}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Original price: ₹{(service?.price || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    💡 The provider will receive your booking request with your
                    proposed price. They can accept, reject, or negotiate
                    further.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Authentication Warning */}
          {!isAuthenticated && (
            <Card className="border border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center text-orange-800">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">
                    You must be logged in to create a booking. Please log in
                    first.
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booking Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Issue Selection (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Link to Issue (Optional)
              </label>
              <select
                value={selectedIssue}
                onChange={(e) => setSelectedIssue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={loadingIssues}
              >
                <option value="">Select an issue (optional)</option>
                {userIssues.map((issue) => (
                  <option
                    key={issue.id || issue._id}
                    value={issue.id || issue._id}
                  >
                    {issue.title}
                  </option>
                ))}
              </select>
              {loadingIssues && (
                <p className="text-sm text-gray-500 mt-1">
                  Loading your issues...
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Notes
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions or requirements..."
                rows={3}
                className="w-full"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  <span className="text-red-700 dark:text-red-300 text-sm">
                    {error}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="default"
                disabled={loading || !isAuthenticated}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Booking...
                  </>
                ) : !isAuthenticated ? (
                  "Please Log In"
                ) : isNegotiating ? (
                  `Propose ₹${proposedPrice.toLocaleString()}`
                ) : (
                  `Book for ₹${(service?.price || 0).toLocaleString()}`
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
