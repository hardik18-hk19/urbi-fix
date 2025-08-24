"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useToast } from "../../contexts/ToastContext";
import { issuesAPI } from "../../lib/api";
import type { Issue } from "../../types";
import {
  DollarSign,
  Calendar,
  Target,
  Users,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";

interface CrowdfundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: Issue | null;
  onSuccess: (updatedIssue: Issue) => void;
}

export default function CrowdfundingModal({
  isOpen,
  onClose,
  issue,
  onSuccess,
}: CrowdfundingModalProps) {
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const isEnabled = issue?.crowdfunding?.isEnabled || false;
  const currentAmount = issue?.crowdfunding?.raisedAmount || 0;
  const currentTarget = issue?.crowdfunding?.targetAmount || 0;
  const contributors = issue?.crowdfunding?.contributors?.length || 0;

  useEffect(() => {
    if (isOpen && issue) {
      setTargetAmount(currentTarget.toString());
      setDeadline(
        issue.crowdfunding?.deadline
          ? new Date(issue.crowdfunding.deadline).toISOString().split("T")[0]
          : ""
      );
      setError(null);
    }
  }, [isOpen, issue, currentTarget]);

  const handleEnableCrowdfunding = async () => {
    if (!issue || !targetAmount) {
      setError("Please enter a target amount");
      return;
    }

    const amount = parseFloat(targetAmount);
    if (amount <= 0) {
      setError("Target amount must be greater than 0");
      return;
    }

    if (amount <= currentAmount) {
      setError("Target amount must be greater than the current raised amount");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("issuesAPI object:", issuesAPI);
      console.log("enableCrowdfunding function:", issuesAPI.enableCrowdfunding);

      const response = await issuesAPI.enableCrowdfunding(
        issue._id || issue.id,
        {
          targetAmount: amount,
          deadline: deadline || undefined,
        }
      );

      if (response.success) {
        addToast({
          message: "Crowdfunding enabled successfully!",
          type: "success",
        });
        onSuccess(response.data);
        onClose();
      }
    } catch (error: any) {
      console.error("Error enabling crowdfunding:", error);
      setError(
        error.response?.data?.message || "Failed to enable crowdfunding"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDisableCrowdfunding = async () => {
    if (!issue) return;

    if (currentAmount > 0) {
      setError(
        "Cannot disable crowdfunding when funds have already been raised"
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await issuesAPI.disableCrowdfunding(
        issue._id || issue.id
      );

      if (response.success) {
        addToast({
          message: "Crowdfunding disabled successfully!",
          type: "success",
        });
        onSuccess(response.data);
        onClose();
      }
    } catch (error: any) {
      console.error("Error disabling crowdfunding:", error);
      setError(
        error.response?.data?.message || "Failed to disable crowdfunding"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTargetAmount("");
    setDeadline("");
    setError(null);
    onClose();
  };

  if (!issue) return null;

  const progressPercentage =
    currentTarget > 0 ? (currentAmount / currentTarget) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            {isEnabled ? "Manage Crowdfunding" : "Enable Crowdfunding"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Issue Title */}
          <div>
            <h3 className="font-medium text-gray-900">{issue.title}</h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {issue.description}
            </p>
          </div>

          {/* Current Status (if enabled) */}
          {isEnabled && (
            <Card className="">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">
                  Current Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Raised: ₹{currentAmount.toLocaleString()}</span>
                  <span>Goal: ₹{currentTarget.toLocaleString()}</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {progressPercentage.toFixed(1)}% complete
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {contributors} contributors
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Amount (₹) *
              </label>
              <Input
                type="number"
                className=""
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="Enter target amount"
                min="1"
                step="100"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deadline (Optional)
              </label>
              <Input
                type="date"
                className=""
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleClose}
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>

            {isEnabled && currentAmount === 0 && (
              <Button
                onClick={handleDisableCrowdfunding}
                variant="destructive"
                size="sm"
                className="flex-1"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Disable"
                )}
              </Button>
            )}

            <Button
              onClick={handleEnableCrowdfunding}
              className="flex-1"
              variant="default"
              size="sm"
              disabled={loading || !targetAmount}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEnabled ? (
                "Update"
              ) : (
                "Enable"
              )}
            </Button>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
            <p className="mb-1">
              💡 <strong>Tip:</strong> Set a realistic target amount based on
              your issue&apos;s estimated cost.
            </p>
            <p>
              {isEnabled && currentAmount > 0
                ? "You cannot disable crowdfunding once contributions have been made."
                : "You can modify or disable crowdfunding anytime before receiving contributions."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
