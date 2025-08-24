"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useToast } from "../../contexts/ToastContext";
import { proposalsAPI } from "../../lib/api";
import {
  DollarSign,
  Calendar,
  FileText,
  Clock,
  Loader2,
  Send,
} from "lucide-react";

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  onProposalSent: () => void;
  bookingData: {
    totalAmount: number;
    scheduledDate: string;
    notes: string;
  };
}

export default function ProposalModal({
  isOpen,
  onClose,
  bookingId,
  onProposalSent,
  bookingData,
}: ProposalModalProps) {
  const [proposalType, setProposalType] = useState<
    "price" | "schedule" | "requirements" | "complete"
  >("price");
  const [proposal, setProposal] = useState({
    price: bookingData.totalAmount,
    scheduledDate: bookingData.scheduledDate.split("T")[0],
    scheduledTime:
      bookingData.scheduledDate.split("T")[1]?.substring(0, 5) || "",
    requirements: bookingData.notes,
    additionalServices: "",
    estimatedDuration: "",
    specialInstructions: "",
    justification: "",
    expirationHours: 24,
  });
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async () => {
    if (!proposal.justification.trim()) {
      addToast({
        type: "error",
        message: "Please provide a justification for your proposal",
        duration: 3000,
      });
      return;
    }

    try {
      setLoading(true);

      const proposedChanges: any = {};

      if (proposalType === "price" || proposalType === "complete") {
        proposedChanges.price = parseFloat(proposal.price.toString());
        proposedChanges.totalAmount = parseFloat(proposal.price.toString());
      }

      if (proposalType === "schedule" || proposalType === "complete") {
        proposedChanges.scheduledDate = new Date(
          `${proposal.scheduledDate}T${proposal.scheduledTime}`
        );
      }

      if (proposalType === "requirements" || proposalType === "complete") {
        proposedChanges.requirements = proposal.requirements;
        if (proposal.additionalServices) {
          proposedChanges.additionalServices = proposal.additionalServices
            .split(",")
            .map((s) => s.trim());
        }
        proposedChanges.estimatedDuration = proposal.estimatedDuration;
        proposedChanges.specialInstructions = proposal.specialInstructions;
      }

      const response = await proposalsAPI.createProposal({
        bookingId,
        proposalType,
        proposedChanges,
        justification: proposal.justification,
        expirationHours: proposal.expirationHours,
      });

      addToast({
        type: "success",
        message: "Proposal sent successfully!",
        duration: 5000,
      });

      onProposalSent();
      onClose();
    } catch (error: any) {
      console.error("Error sending proposal:", error);
      addToast({
        type: "error",
        message: error.response?.data?.message || "Failed to send proposal",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderProposalFields = () => {
    switch (proposalType) {
      case "price":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Proposed Price ($)
              </label>
              <Input
                type="number"
                className=""
                value={proposal.price}
                onChange={(e) =>
                  setProposal({
                    ...proposal,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="Enter your proposed price"
              />
              <p className="text-sm text-gray-500 mt-1">
                Current price: ${bookingData.totalAmount}
              </p>
            </div>
          </div>
        );

      case "schedule":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Proposed Date
                </label>
                <Input
                  type="date"
                  className=""
                  value={proposal.scheduledDate}
                  onChange={(e) =>
                    setProposal({ ...proposal, scheduledDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Proposed Time
                </label>
                <Input
                  type="time"
                  className=""
                  value={proposal.scheduledTime}
                  onChange={(e) =>
                    setProposal({ ...proposal, scheduledTime: e.target.value })
                  }
                />
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Current schedule:{" "}
              {new Date(bookingData.scheduledDate).toLocaleString()}
            </p>
          </div>
        );

      case "requirements":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Updated Requirements
              </label>
              <Textarea
                value={proposal.requirements}
                onChange={(e) =>
                  setProposal({ ...proposal, requirements: e.target.value })
                }
                placeholder="Describe the updated requirements..."
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Additional Services (comma-separated)
              </label>
              <Input
                type="text"
                className=""
                value={proposal.additionalServices}
                onChange={(e) =>
                  setProposal({
                    ...proposal,
                    additionalServices: e.target.value,
                  })
                }
                placeholder="e.g., Deep cleaning, Material supply"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Estimated Duration
              </label>
              <Input
                type="text"
                className=""
                value={proposal.estimatedDuration}
                onChange={(e) =>
                  setProposal({
                    ...proposal,
                    estimatedDuration: e.target.value,
                  })
                }
                placeholder="e.g., 2-3 hours, 1 day"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Special Instructions
              </label>
              <Textarea
                value={proposal.specialInstructions}
                onChange={(e) =>
                  setProposal({
                    ...proposal,
                    specialInstructions: e.target.value,
                  })
                }
                placeholder="Any special instructions or considerations..."
                rows={2}
              />
            </div>
          </div>
        );

      case "complete":
        return (
          <div className="space-y-6">
            {/* Price Section */}
            <Card className="">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Proposed Price ($)
                  </label>
                  <Input
                    type="number"
                    className=""
                    value={proposal.price}
                    onChange={(e) =>
                      setProposal({
                        ...proposal,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Enter your proposed price"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Current price: ${bookingData.totalAmount}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Section */}
            <Card className="">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Proposed Date
                    </label>
                    <Input
                      type="date"
                      className=""
                      value={proposal.scheduledDate}
                      onChange={(e) =>
                        setProposal({
                          ...proposal,
                          scheduledDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Proposed Time
                    </label>
                    <Input
                      type="time"
                      className=""
                      value={proposal.scheduledTime}
                      onChange={(e) =>
                        setProposal({
                          ...proposal,
                          scheduledTime: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Requirements Section */}
            <Card className="">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Requirements & Services
                </CardTitle>
              </CardHeader>
              <CardContent className="">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Service Requirements
                    </label>
                    <Textarea
                      value={proposal.requirements}
                      onChange={(e) =>
                        setProposal({
                          ...proposal,
                          requirements: e.target.value,
                        })
                      }
                      placeholder="Describe the service requirements..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Additional Services
                    </label>
                    <Input
                      type="text"
                      className=""
                      value={proposal.additionalServices}
                      onChange={(e) =>
                        setProposal({
                          ...proposal,
                          additionalServices: e.target.value,
                        })
                      }
                      placeholder="e.g., Deep cleaning, Material supply"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Estimated Duration
                    </label>
                    <Input
                      type="text"
                      className=""
                      value={proposal.estimatedDuration}
                      onChange={(e) =>
                        setProposal({
                          ...proposal,
                          estimatedDuration: e.target.value,
                        })
                      }
                      placeholder="e.g., 2-3 hours, 1 day"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Counter Proposal</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Proposal Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">
              What would you like to modify?
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                variant={proposalType === "price" ? "default" : "outline"}
                size="sm"
                className=""
                onClick={() => setProposalType("price")}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Price
              </Button>
              <Button
                variant={proposalType === "schedule" ? "default" : "outline"}
                size="sm"
                className=""
                onClick={() => setProposalType("schedule")}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Schedule
              </Button>
              <Button
                variant={
                  proposalType === "requirements" ? "default" : "outline"
                }
                size="sm"
                className=""
                onClick={() => setProposalType("requirements")}
              >
                <FileText className="h-4 w-4 mr-1" />
                Requirements
              </Button>
              <Button
                variant={proposalType === "complete" ? "default" : "outline"}
                size="sm"
                className=""
                onClick={() => setProposalType("complete")}
              >
                All
              </Button>
            </div>
          </div>

          {/* Proposal Fields */}
          {renderProposalFields()}

          {/* Justification */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Justification <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={proposal.justification}
              onChange={(e) =>
                setProposal({ ...proposal, justification: e.target.value })
              }
              placeholder="Explain why you're making this proposal..."
              rows={3}
            />
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Proposal Valid For (hours)
            </label>
            <Input
              type="number"
              className=""
              value={proposal.expirationHours}
              onChange={(e) =>
                setProposal({
                  ...proposal,
                  expirationHours: parseInt(e.target.value) || 24,
                })
              }
              min="1"
              max="168"
            />
            <p className="text-sm text-gray-500 mt-1">
              Proposal will expire in {proposal.expirationHours} hours
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              variant="default"
              size="default"
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading || !proposal.justification.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Proposal
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="default"
              className=""
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
