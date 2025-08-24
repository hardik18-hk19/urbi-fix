import Comment from "../models/Comment.js";
import Issue from "../models/Issue.js";

// Get all comments for an issue
export const getCommentsByIssue = async (req, res) => {
  try {
    const { issueId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await Comment.countDocuments({
      issue: issueId,
      isDeleted: false,
      parentComment: null, // Only top-level comments for pagination
    });

    const comments = await Comment.find({
      issue: issueId,
      isDeleted: false,
      parentComment: null,
    })
      .populate("author", "name avatar role")
      .populate({
        path: "replies",
        match: { isDeleted: false },
        populate: {
          path: "author",
          select: "name avatar role",
        },
        options: { sort: { createdAt: 1 } },
      })
      .sort({ isMarkedAsSolution: -1, upvotes: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: comments,
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
    console.error("Error fetching comments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch comments",
      error: error.message,
    });
  }
};

// Create a new comment
export const createComment = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { content, parentComment, estimatedCost, estimatedTime } = req.body;
    const userId = req.user.id;

    // Validate issue exists
    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    // If parentComment is provided, validate it exists
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent || parent.issue.toString() !== issueId) {
        return res.status(404).json({
          success: false,
          message: "Parent comment not found",
        });
      }
    }

    const commentData = {
      issue: issueId,
      author: userId,
      content,
      parentComment: parentComment || null,
      isProviderResponse: req.user.role === "provider",
    };

    // Add provider-specific fields if provider is commenting
    if (req.user.role === "provider" && estimatedCost) {
      commentData.estimatedCost = estimatedCost;
    }
    if (req.user.role === "provider" && estimatedTime) {
      commentData.estimatedTime = estimatedTime;
    }

    const comment = new Comment(commentData);
    await comment.save();

    // Populate author data for response
    await comment.populate("author", "name avatar role");

    // Update parent comment's replies array if this is a reply
    if (parentComment) {
      await Comment.findByIdAndUpdate(parentComment, {
        $push: { replies: comment._id },
      });
    }

    // Update issue's comment count
    await Issue.findByIdAndUpdate(issueId, {
      $inc: { commentsCount: 1 },
    });

    res.status(201).json({
      success: true,
      data: comment,
      message: "Comment created successfully",
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create comment",
      error: error.message,
    });
  }
};

// Update a comment
export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if user owns the comment
    if (comment.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own comments",
      });
    }

    // Check if comment is not too old (e.g., 24 hours)
    const hoursSinceCreation =
      (Date.now() - comment.createdAt) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      return res.status(400).json({
        success: false,
        message: "Comments can only be edited within 24 hours of creation",
      });
    }

    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();

    await comment.populate("author", "name avatar role");

    res.status(200).json({
      success: true,
      data: comment,
      message: "Comment updated successfully",
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update comment",
      error: error.message,
    });
  }
};

// Delete a comment
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if user owns the comment or is admin
    if (comment.author.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own comments",
      });
    }

    // Soft delete
    comment.isDeleted = true;
    comment.deletedAt = new Date();
    comment.content = "[This comment has been deleted]";
    await comment.save();

    // Update issue's comment count
    await Issue.findByIdAndUpdate(comment.issue, {
      $inc: { commentsCount: -1 },
    });

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete comment",
      error: error.message,
    });
  }
};

// Upvote/downvote a comment
export const voteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { voteType } = req.body; // "upvote" or "downvote"
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if user already voted
    const hasUpvoted = comment.upvotedBy.includes(userId);
    const hasDownvoted = comment.downvotedBy.includes(userId);

    if (voteType === "upvote") {
      if (hasUpvoted) {
        // Remove upvote
        comment.upvotedBy.pull(userId);
        comment.upvotes = Math.max(0, comment.upvotes - 1);
      } else {
        // Add upvote and remove downvote if exists
        if (hasDownvoted) {
          comment.downvotedBy.pull(userId);
          comment.downvotes = Math.max(0, comment.downvotes - 1);
        }
        comment.upvotedBy.push(userId);
        comment.upvotes += 1;
      }
    } else if (voteType === "downvote") {
      if (hasDownvoted) {
        // Remove downvote
        comment.downvotedBy.pull(userId);
        comment.downvotes = Math.max(0, comment.downvotes - 1);
      } else {
        // Add downvote and remove upvote if exists
        if (hasUpvoted) {
          comment.upvotedBy.pull(userId);
          comment.upvotes = Math.max(0, comment.upvotes - 1);
        }
        comment.downvotedBy.push(userId);
        comment.downvotes += 1;
      }
    }

    await comment.save();

    res.status(200).json({
      success: true,
      data: {
        upvotes: comment.upvotes,
        downvotes: comment.downvotes,
        hasUpvoted: comment.upvotedBy.includes(userId),
        hasDownvoted: comment.downvotedBy.includes(userId),
      },
      message: "Vote updated successfully",
    });
  } catch (error) {
    console.error("Error voting on comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to vote on comment",
      error: error.message,
    });
  }
};

// Mark comment as solution (only issue creator can do this)
export const markAsSolution = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId).populate("issue");

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if user is the issue creator
    if (comment.issue.consumer.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the issue creator can mark solutions",
      });
    }

    // Remove solution mark from other comments
    await Comment.updateMany(
      { issue: comment.issue._id },
      {
        isMarkedAsSolution: false,
        $unset: { markedAsSolutionBy: 1, markedAsSolutionAt: 1 },
      }
    );

    // Mark this comment as solution
    comment.isMarkedAsSolution = true;
    comment.markedAsSolutionBy = userId;
    comment.markedAsSolutionAt = new Date();
    await comment.save();

    res.status(200).json({
      success: true,
      message: "Comment marked as solution successfully",
    });
  } catch (error) {
    console.error("Error marking comment as solution:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark comment as solution",
      error: error.message,
    });
  }
};
