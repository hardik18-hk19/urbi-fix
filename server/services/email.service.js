import nodemailer from "nodemailer";
import config from "../config/env.js";

class EmailService {
  constructor() {
    // Choose configuration method based on available environment variables
    if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS) {
      // Use SMTP configuration (Brevo/Sendinblue or other providers)
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: parseInt(config.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      console.log(`Email service initialized with SMTP: ${config.SMTP_HOST}`);
    } else if (config.EMAIL_USER && config.EMAIL_PASS) {
      // Use Gmail configuration (fallback)
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: config.EMAIL_USER,
          pass: config.EMAIL_PASS,
        },
      });
      console.log("Email service initialized with Gmail");
    } else {
      console.error(
        "No email configuration found. Please set up SMTP or Gmail credentials."
      );
      this.transporter = null;
    }
  }

  getSenderEmail() {
    return config.SENDER_EMAIL || config.EMAIL_USER || config.SMTP_USER;
  }

  async sendIssueToGoverningBody(issue, consumer, category) {
    if (!this.transporter) {
      throw new Error(
        "Email service not configured. Please check your email settings."
      );
    }

    try {
      const emailTemplate = this.generateIssueEmailTemplate(
        issue,
        consumer,
        category
      );

      const mailOptions = {
        from: `"UrbieFix Issue Reporter" <${this.getSenderEmail()}>`,
        to: config.GOVERNING_BODY_EMAIL,
        cc: config.ADMIN_EMAIL, // Optional: CC to admin
        subject: `Urgent Issue Report: ${
          issue.title
        } - Priority: ${issue.priority.toUpperCase()}`,
        html: emailTemplate,
        attachments: this.generateAttachments(issue),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("Issue email sent to governing body:", result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("Error sending issue email:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  generateIssueEmailTemplate(issue, consumer, category) {
    const priorityColor = this.getPriorityColor(issue.priority);
    const statusColor = this.getStatusColor(issue.status);

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Issue Report - ${issue.title}</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 10px;
                margin-bottom: 30px;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
            }
            .priority-badge {
                display: inline-block;
                padding: 5px 15px;
                border-radius: 20px;
                color: white;
                font-weight: bold;
                font-size: 12px;
                text-transform: uppercase;
                margin: 10px 0;
            }
            .status-badge {
                display: inline-block;
                padding: 5px 15px;
                border-radius: 20px;
                color: white;
                font-weight: bold;
                font-size: 12px;
                text-transform: uppercase;
                margin: 10px 0;
            }
            .section {
                margin-bottom: 25px;
                padding: 20px;
                border-left: 4px solid #667eea;
                background-color: #f8f9fa;
                border-radius: 5px;
            }
            .section h2 {
                color: #667eea;
                margin-top: 0;
                font-size: 18px;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 20px 0;
            }
            .info-item {
                background: white;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            }
            .info-item strong {
                color: #495057;
                display: block;
                margin-bottom: 5px;
            }
            .location-info {
                background: #e3f2fd;
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
            }
            .footer {
                background-color: #343a40;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 10px;
                margin-top: 30px;
            }
            .urgent-notice {
                background-color: #dc3545;
                color: white;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
                font-weight: bold;
            }
            .map-link {
                background: #28a745;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                text-decoration: none;
                display: inline-block;
                margin-top: 10px;
            }
            .images-section {
                margin: 20px 0;
            }
            .image-info {
                background: #fff3cd;
                padding: 10px;
                border-radius: 5px;
                border-left: 4px solid #ffc107;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚨 URGENT ISSUE REPORT</h1>
                <p>UrbieFix - Citizen Issue Reporting System</p>
            </div>

            ${
              issue.priority === "urgent"
                ? `
            <div class="urgent-notice">
                ⚠️ THIS IS AN URGENT ISSUE REQUIRING IMMEDIATE ATTENTION ⚠️
            </div>
            `
                : ""
            }

            <div class="section">
                <h2>📋 Issue Summary</h2>
                <h3>${issue.title}</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Priority Level:</strong>
                        <span class="priority-badge" style="background-color: ${priorityColor};">
                            ${issue.priority.toUpperCase()}
                        </span>
                    </div>
                    <div class="info-item">
                        <strong>Current Status:</strong>
                        <span class="status-badge" style="background-color: ${statusColor};">
                            ${issue.status.replace("_", " ").toUpperCase()}
                        </span>
                    </div>
                    <div class="info-item">
                        <strong>Category:</strong>
                        ${category ? category.name : "N/A"}
                    </div>
                    <div class="info-item">
                        <strong>Reported Date:</strong>
                        ${new Date(issue.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>📝 Issue Description</h2>
                <p>${issue.description}</p>
            </div>

            <div class="section">
                <h2>📍 Location Information</h2>
                <div class="location-info">
                    <strong>Address:</strong> ${
                      issue.location?.address || "Address not provided"
                    }<br>
                    ${
                      issue.location?.coordinates
                        ? `
                    <strong>Coordinates:</strong> 
                    Latitude: ${issue.location.coordinates.latitude}, 
                    Longitude: ${issue.location.coordinates.longitude}<br>
                    <a href="https://www.google.com/maps?q=${issue.location.coordinates.latitude},${issue.location.coordinates.longitude}" 
                       target="_blank" class="map-link">
                        📍 View on Google Maps
                    </a>
                    `
                        : ""
                    }
                </div>
            </div>

            <div class="section">
                <h2>👤 Reporter Information</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Name:</strong>
                        ${consumer.personalInfo?.firstName || ""} ${
      consumer.personalInfo?.lastName || ""
    }
                    </div>
                    <div class="info-item">
                        <strong>Email:</strong>
                        ${consumer.email}
                    </div>
                    <div class="info-item">
                        <strong>Phone:</strong>
                        ${consumer.personalInfo?.phone || "Not provided"}
                    </div>
                    <div class="info-item">
                        <strong>User ID:</strong>
                        ${consumer._id}
                    </div>
                </div>
            </div>

            ${
              issue.estimatedCost
                ? `
            <div class="section">
                <h2>💰 Cost Estimation</h2>
                <p><strong>Estimated Cost:</strong> $${issue.estimatedCost.toLocaleString()}</p>
            </div>
            `
                : ""
            }

            <div class="section">
                <h2>📊 Community Engagement</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Community Upvotes:</strong>
                        ${issue.upvotes} votes
                    </div>
                    <div class="info-item">
                        <strong>Views Count:</strong>
                        ${issue.viewsCount} views
                    </div>
                    <div class="info-item">
                        <strong>Comments:</strong>
                        ${issue.commentsCount} comments
                    </div>
                    <div class="info-item">
                        <strong>Issue ID:</strong>
                        ${issue._id}
                    </div>
                </div>
            </div>

            ${
              issue.crowdfunding?.isEnabled
                ? `
            <div class="section">
                <h2>💸 Crowdfunding Information</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>Target Amount:</strong>
                        $${issue.crowdfunding.targetAmount.toLocaleString()}
                    </div>
                    <div class="info-item">
                        <strong>Amount Raised:</strong>
                        $${issue.crowdfunding.raisedAmount.toLocaleString()}
                    </div>
                    <div class="info-item">
                        <strong>Contributors:</strong>
                        ${issue.crowdfunding.contributors.length} people
                    </div>
                    <div class="info-item">
                        <strong>Deadline:</strong>
                        ${
                          issue.crowdfunding.deadline
                            ? new Date(
                                issue.crowdfunding.deadline
                              ).toLocaleDateString()
                            : "Not set"
                        }
                    </div>
                </div>
            </div>
            `
                : ""
            }

            ${
              issue.images && issue.images.length > 0
                ? `
            <div class="section">
                <h2>📷 Attached Images</h2>
                <div class="image-info">
                    <strong>Number of images attached:</strong> ${issue.images.length}<br>
                    <em>Images are attached to this email for your review.</em>
                </div>
            </div>
            `
                : ""
            }

            <div class="section">
                <h2>🎯 Recommended Actions</h2>
                <ul>
                    <li><strong>Immediate Assessment:</strong> Please review the urgency and priority level of this issue</li>
                    <li><strong>Resource Allocation:</strong> Determine appropriate department/team for resolution</li>
                    <li><strong>Timeline:</strong> Establish expected resolution timeframe</li>
                    <li><strong>Communication:</strong> Provide updates to the reporting citizen and community</li>
                    <li><strong>Follow-up:</strong> Monitor progress and ensure timely resolution</li>
                </ul>
            </div>

            <div class="footer">
                <h3>📞 Need Immediate Action?</h3>
                <p>For urgent issues requiring immediate attention, please contact:</p>
                <p><strong>Emergency Hotline:</strong> ${
                  config.EMERGENCY_HOTLINE || "911"
                }</p>
                <p><strong>UrbieFix Admin:</strong> ${config.ADMIN_EMAIL}</p>
                <p><strong>System:</strong> UrbieFix Issue Management System</p>
                <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getPriorityColor(priority) {
    const colors = {
      low: "#28a745",
      medium: "#ffc107",
      high: "#fd7e14",
      urgent: "#dc3545",
    };
    return colors[priority] || "#6c757d";
  }

  getStatusColor(status) {
    const colors = {
      open: "#007bff",
      in_progress: "#ffc107",
      resolved: "#28a745",
      closed: "#6c757d",
    };
    return colors[status] || "#6c757d";
  }

  generateAttachments(issue) {
    const attachments = [];

    // If there are images, add them as attachments
    if (issue.images && issue.images.length > 0) {
      issue.images.forEach((imageUrl, index) => {
        attachments.push({
          filename: `issue_image_${index + 1}.jpg`,
          path: imageUrl,
          cid: `image${index + 1}`, // Content-ID for inline images
        });
      });
    }

    return attachments;
  }

  // Method to send confirmation email to the issue reporter
  async sendConfirmationToReporter(issue, consumer, category) {
    if (!this.transporter) {
      throw new Error(
        "Email service not configured. Please check your email settings."
      );
    }

    try {
      const mailOptions = {
        from: `"UrbieFix Support" <${this.getSenderEmail()}>`,
        to: consumer.email,
        subject: `Issue Report Confirmation: ${issue.title}`,
        html: this.generateConfirmationTemplate(issue, consumer, category),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("Confirmation email sent to reporter:", result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("Error sending confirmation email:", error);
      throw new Error(`Failed to send confirmation email: ${error.message}`);
    }
  }

  generateConfirmationTemplate(issue, consumer, category) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px; }
            .content { padding: 20px; background: #f9f9f9; border-radius: 10px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Issue Report Confirmed</h1>
                <p>Thank you for using UrbieFix</p>
            </div>
            
            <div class="content">
                <h2>Hello ${consumer.personalInfo?.firstName || "Citizen"},</h2>
                
                <p>Your issue report has been successfully received and forwarded to the appropriate governing body for review.</p>
                
                <h3>Issue Details:</h3>
                <ul>
                    <li><strong>Title:</strong> ${issue.title}</li>
                    <li><strong>Category:</strong> ${
                      category?.name || "N/A"
                    }</li>
                    <li><strong>Priority:</strong> ${issue.priority.toUpperCase()}</li>
                    <li><strong>Issue ID:</strong> ${issue._id}</li>
                    <li><strong>Reported:</strong> ${new Date(
                      issue.createdAt
                    ).toLocaleDateString()}</li>
                </ul>
                
                <p><strong>What happens next?</strong></p>
                <ol>
                    <li>Your issue has been forwarded to the governing body</li>
                    <li>They will review and assign appropriate resources</li>
                    <li>You'll receive updates on the progress</li>
                    <li>You can track the status in your UrbieFix dashboard</li>
                </ol>
                
                <p>You can track the progress of your issue by logging into your UrbieFix account.</p>
            </div>
            
            <div class="footer">
                <p>Thank you for helping improve our community!</p>
                <p>UrbieFix Team</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Test email connection
  async testConnection() {
    if (!this.transporter) {
      console.error("Email transporter not configured");
      return false;
    }

    try {
      await this.transporter.verify();
      console.log("Email service is ready to send emails");
      return true;
    } catch (error) {
      console.error("Email service connection failed:", error);
      return false;
    }
  }
}

export default new EmailService();
