import Issue from "../models/Issue.js";
import Consumer from "../models/consumer.js";
import Provider from "../models/provider.js";

class IssueService {
  // Create new issue
  async createIssue(userId, issueData) {
    const consumer = await Consumer.findOne({ user: userId });
    if (!consumer) {
      throw new Error("Consumer profile not found");
    }

    const issue = new Issue({
      ...issueData,
      reportedBy: consumer._id,
      status: "open",
    });

    await issue.save();
    return await this.getIssueById(issue._id);
  }

  // Get issue by ID
  async getIssueById(issueId) {
    const issue = await Issue.findById(issueId)
      .populate("reportedBy", "profile")
      .populate("assignedTo", "profile")
      .populate("relatedProvider", "profile")
      .populate("relatedService", "name description");

    if (!issue) {
      throw new Error("Issue not found");
    }

    return issue;
  }

  // Get all issues (admin only)
  async getAllIssues(filters = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      category,
      search,
      startDate,
      endDate,
    } = filters;

    let filter = {};

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (category) {
      filter.category = category;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    let issues = await Issue.find(filter)
      .populate("reportedBy", "profile")
      .populate("assignedTo", "profile")
      .populate("relatedProvider", "profile")
      .populate("relatedService", "name description")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Apply search filter
    if (search) {
      issues = issues.filter(
        (issue) =>
          issue.title.toLowerCase().includes(search.toLowerCase()) ||
          issue.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = await Issue.countDocuments(filter);

    return {
      issues,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  // Get user's issues
  async getUserIssues(userId, userRole, filters = {}) {
    const { page = 1, limit = 10, status } = filters;

    let filter = {};

    if (userRole === "consumer") {
      const consumer = await Consumer.findOne({ user: userId });
      if (!consumer) {
        throw new Error("Consumer profile not found");
      }
      filter.reportedBy = consumer._id;
    } else if (userRole === "provider") {
      const provider = await Provider.findOne({ user: userId });
      if (!provider) {
        throw new Error("Provider profile not found");
      }
      filter.relatedProvider = provider._id;
    }

    if (status) {
      filter.status = status;
    }

    const issues = await Issue.find(filter)
      .populate("reportedBy", "profile")
      .populate("assignedTo", "profile")
      .populate("relatedProvider", "profile")
      .populate("relatedService", "name description")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Issue.countDocuments(filter);

    return {
      issues,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  // Update issue status
  async updateIssueStatus(
    issueId,
    status,
    userId,
    userRole,
    additionalData = {}
  ) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error("Issue not found");
    }

    const validStatuses = ["open", "in_progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status");
    }

    // Check permissions
    let canUpdate = false;

    if (userRole === "admin") {
      canUpdate = true;
    } else if (userRole === "consumer") {
      const consumer = await Consumer.findOne({ user: userId });
      canUpdate = issue.reportedBy.toString() === consumer._id.toString();
    } else if (userRole === "provider") {
      const provider = await Provider.findOne({ user: userId });
      canUpdate =
        issue.relatedProvider &&
        issue.relatedProvider.toString() === provider._id.toString();
    }

    if (!canUpdate) {
      throw new Error("Access denied");
    }

    const updateData = {
      status,
      ...additionalData,
    };

    if (status === "resolved" && !issue.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    const updatedIssue = await Issue.findByIdAndUpdate(issueId, updateData, {
      new: true,
    })
      .populate("reportedBy", "profile")
      .populate("assignedTo", "profile")
      .populate("relatedProvider", "profile")
      .populate("relatedService", "name description");

    return updatedIssue;
  }

  // Assign issue to admin/support
  async assignIssue(issueId, assignedToId, assignedById) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error("Issue not found");
    }

    const updatedIssue = await Issue.findByIdAndUpdate(
      issueId,
      {
        assignedTo: assignedToId,
        assignedBy: assignedById,
        status: "in_progress",
      },
      { new: true }
    )
      .populate("reportedBy", "profile")
      .populate("assignedTo", "profile")
      .populate("relatedProvider", "profile")
      .populate("relatedService", "name description");

    return updatedIssue;
  }

  // Add comment to issue
  async addComment(issueId, userId, userRole, commentText) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error("Issue not found");
    }

    // Check if user has access to this issue
    let hasAccess = false;

    if (userRole === "admin") {
      hasAccess = true;
    } else if (userRole === "consumer") {
      const consumer = await Consumer.findOne({ user: userId });
      hasAccess = issue.reportedBy.toString() === consumer._id.toString();
    } else if (userRole === "provider") {
      const provider = await Provider.findOne({ user: userId });
      hasAccess =
        issue.relatedProvider &&
        issue.relatedProvider.toString() === provider._id.toString();
    }

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    const comment = {
      author: userId,
      authorRole: userRole,
      text: commentText,
      createdAt: new Date(),
    };

    issue.comments.push(comment);
    await issue.save();

    return await this.getIssueById(issueId);
  }

  // Update issue priority
  async updatePriority(issueId, priority) {
    const validPriorities = ["low", "medium", "high", "urgent"];
    if (!validPriorities.includes(priority)) {
      throw new Error("Invalid priority");
    }

    const updatedIssue = await Issue.findByIdAndUpdate(
      issueId,
      { priority },
      { new: true }
    )
      .populate("reportedBy", "profile")
      .populate("assignedTo", "profile")
      .populate("relatedProvider", "profile")
      .populate("relatedService", "name description");

    if (!updatedIssue) {
      throw new Error("Issue not found");
    }

    return updatedIssue;
  }

  // Get issue statistics
  async getIssueStats() {
    const stats = {
      total: await Issue.countDocuments(),
      open: await Issue.countDocuments({ status: "open" }),
      inProgress: await Issue.countDocuments({ status: "in_progress" }),
      resolved: await Issue.countDocuments({ status: "resolved" }),
      closed: await Issue.countDocuments({ status: "closed" }),
      byPriority: {
        low: await Issue.countDocuments({ priority: "low" }),
        medium: await Issue.countDocuments({ priority: "medium" }),
        high: await Issue.countDocuments({ priority: "high" }),
        urgent: await Issue.countDocuments({ priority: "urgent" }),
      },
      today: await Issue.countDocuments({
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
      }),
      thisWeek: await Issue.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      thisMonth: await Issue.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
    };

    return stats;
  }

  // Delete issue (admin only)
  async deleteIssue(issueId) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error("Issue not found");
    }

    await Issue.findByIdAndDelete(issueId);
    return { message: "Issue deleted successfully" };
  }
}

export default new IssueService();
