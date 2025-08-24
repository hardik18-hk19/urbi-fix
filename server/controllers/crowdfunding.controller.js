import CrowdfundingTransaction from "../models/CrowdfundingTransaction.js";
import Issue from "../models/Issue.js";
import mongoose from "mongoose";

// Get crowdfunding details for an issue
export const getCrowdfundingDetails = async (req, res) => {
  try {
    const { issueId } = req.params;

    const issue = await Issue.findById(issueId)
      .populate("crowdfunding.contributors.user", "name avatar")
      .select("crowdfunding title");

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    // Get recent transactions for this issue
    const recentTransactions = await CrowdfundingTransaction.find({
      issue: issueId,
      status: "completed",
    })
      .populate("contributor", "name avatar")
      .sort({ completedAt: -1 })
      .limit(10);

    // Calculate progress percentage
    const progressPercentage =
      issue.crowdfunding.targetAmount > 0
        ? Math.min(
            (issue.crowdfunding.raisedAmount /
              issue.crowdfunding.targetAmount) *
              100,
            100
          )
        : 0;

    res.status(200).json({
      success: true,
      data: {
        crowdfunding: issue.crowdfunding,
        progressPercentage: Math.round(progressPercentage),
        recentTransactions: recentTransactions.map((tx) => ({
          id: tx._id,
          contributor: tx.isAnonymous ? null : tx.contributor,
          amount: tx.amount,
          message: tx.message,
          contributedAt: tx.completedAt,
          isAnonymous: tx.isAnonymous,
        })),
        isCompleted:
          issue.crowdfunding.raisedAmount >= issue.crowdfunding.targetAmount,
        daysLeft: issue.crowdfunding.deadline
          ? Math.max(
              0,
              Math.ceil(
                (new Date(issue.crowdfunding.deadline) - new Date()) /
                  (1000 * 60 * 60 * 24)
              )
            )
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching crowdfunding details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch crowdfunding details",
      error: error.message,
    });
  }
};

// Enable crowdfunding for an issue
export const enableCrowdfunding = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { targetAmount, deadline } = req.body;
    const userId = req.user.id;

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    // Check if user is the issue creator or admin
    if (issue.consumer.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only the issue creator or admin can enable crowdfunding",
      });
    }

    // Validate target amount
    if (!targetAmount || targetAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Target amount must be greater than 0",
      });
    }

    // Validate deadline
    if (deadline && new Date(deadline) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Deadline must be in the future",
      });
    }

    // Update issue with crowdfunding details
    issue.crowdfunding.isEnabled = true;
    issue.crowdfunding.targetAmount = targetAmount;
    issue.crowdfunding.deadline = deadline ? new Date(deadline) : null;

    await issue.save();

    res.status(200).json({
      success: true,
      data: issue.crowdfunding,
      message: "Crowdfunding enabled successfully",
    });
  } catch (error) {
    console.error("Error enabling crowdfunding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to enable crowdfunding",
      error: error.message,
    });
  }
};

// Contribute to crowdfunding
export const contributeToCrowdfunding = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { amount, paymentMethod, isAnonymous, message, transactionId } =
      req.body;
    const userId = req.user.id;

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    // Check if crowdfunding is enabled
    if (!issue.crowdfunding.isEnabled) {
      return res.status(400).json({
        success: false,
        message: "Crowdfunding is not enabled for this issue",
      });
    }

    // Check if deadline has passed
    if (
      issue.crowdfunding.deadline &&
      new Date(issue.crowdfunding.deadline) < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Crowdfunding deadline has passed",
      });
    }

    // Check if target amount is already reached
    if (issue.crowdfunding.raisedAmount >= issue.crowdfunding.targetAmount) {
      return res.status(400).json({
        success: false,
        message: "Target amount has already been reached",
      });
    }

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Contribution amount must be greater than 0",
      });
    }

    // Check if transaction ID already exists
    const existingTransaction = await CrowdfundingTransaction.findOne({
      transactionId,
    });
    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID already exists",
      });
    }

    // Create transaction record
    const transaction = new CrowdfundingTransaction({
      issue: issueId,
      contributor: userId,
      amount,
      transactionId,
      paymentMethod,
      isAnonymous: Boolean(isAnonymous),
      message: message || "",
      status: "completed", // In real app, this would be "pending" until payment confirmation
      completedAt: new Date(),
    });

    await transaction.save();

    // Update issue crowdfunding data
    issue.crowdfunding.raisedAmount += amount;
    issue.crowdfunding.contributors.push({
      user: userId,
      amount,
      contributedAt: new Date(),
      transactionId,
      isAnonymous: Boolean(isAnonymous),
    });

    await issue.save();

    // Populate transaction for response
    await transaction.populate("contributor", "name avatar");

    res.status(201).json({
      success: true,
      data: {
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          contributor: transaction.isAnonymous ? null : transaction.contributor,
          message: transaction.message,
          contributedAt: transaction.completedAt,
          isAnonymous: transaction.isAnonymous,
        },
        crowdfunding: {
          raisedAmount: issue.crowdfunding.raisedAmount,
          targetAmount: issue.crowdfunding.targetAmount,
          progressPercentage: Math.round(
            (issue.crowdfunding.raisedAmount /
              issue.crowdfunding.targetAmount) *
              100
          ),
          isCompleted:
            issue.crowdfunding.raisedAmount >= issue.crowdfunding.targetAmount,
        },
      },
      message: "Contribution successful",
    });
  } catch (error) {
    console.error("Error contributing to crowdfunding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process contribution",
      error: error.message,
    });
  }
};

// Get user's contribution history
export const getUserContributions = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await CrowdfundingTransaction.countDocuments({
      contributor: userId,
      status: "completed",
    });

    const contributions = await CrowdfundingTransaction.find({
      contributor: userId,
      status: "completed",
    })
      .populate("issue", "title status crowdfunding")
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: contributions.map((contribution) => ({
        id: contribution._id,
        amount: contribution.amount,
        message: contribution.message,
        contributedAt: contribution.completedAt,
        issue: {
          id: contribution.issue._id,
          title: contribution.issue.title,
          status: contribution.issue.status,
          targetAmount: contribution.issue.crowdfunding.targetAmount,
          raisedAmount: contribution.issue.crowdfunding.raisedAmount,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching user contributions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contribution history",
      error: error.message,
    });
  }
};

// Close crowdfunding and assign provider (admin only)
export const closeCrowdfundingAndAssign = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { providerId } = req.body;

    // Check admin permission
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can close crowdfunding and assign providers",
      });
    }

    const issue = await Issue.findById(issueId).populate(
      "assignedProvider",
      "name email"
    );

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    if (!issue.crowdfunding.isEnabled) {
      return res.status(400).json({
        success: false,
        message: "Crowdfunding is not enabled for this issue",
      });
    }

    // Assign provider and update status
    issue.assignedProvider = providerId;
    issue.status = "in_progress";
    issue.crowdfunding.isEnabled = false; // Close crowdfunding

    await issue.save();

    await issue.populate("assignedProvider", "name email");

    res.status(200).json({
      success: true,
      data: {
        issue: {
          id: issue._id,
          title: issue.title,
          status: issue.status,
          assignedProvider: issue.assignedProvider,
          crowdfunding: issue.crowdfunding,
        },
      },
      message: "Crowdfunding closed and provider assigned successfully",
    });
  } catch (error) {
    console.error("Error closing crowdfunding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to close crowdfunding",
      error: error.message,
    });
  }
};
