import emailService from "../services/email.service.js";
import config from "../config/env.js";

// Test script for email service
async function testEmailService() {
  console.log("Testing email service...");

  try {
    // Test connection
    console.log("1. Testing email connection...");
    const isConnected = await emailService.testConnection();
    console.log(`Connection status: ${isConnected ? "SUCCESS" : "FAILED"}`);

    if (!isConnected) {
      console.log("Please check your email configuration in .env file");
      return;
    }

    // Create sample issue data for testing
    const sampleIssue = {
      _id: "test-issue-id",
      title: "Sample Issue for Testing",
      description:
        "This is a test issue to verify email functionality is working correctly.",
      priority: "high",
      status: "open",
      location: {
        address: "123 Test Street, Test City, TC 12345",
        coordinates: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      },
      upvotes: 5,
      viewsCount: 15,
      commentsCount: 3,
      estimatedCost: 1500,
      images: [],
      createdAt: new Date(),
      crowdfunding: {
        isEnabled: false,
      },
    };

    const sampleConsumer = {
      _id: "test-consumer-id",
      email: config.ADMIN_EMAIL || "test@example.com",
      personalInfo: {
        firstName: "Test",
        lastName: "User",
        phone: "+1-555-0123",
      },
    };

    const sampleCategory = {
      name: "Infrastructure",
      _id: "test-category-id",
    };

    console.log("2. Testing confirmation email...");
    try {
      const confirmationResult = await emailService.sendConfirmationToReporter(
        sampleIssue,
        sampleConsumer,
        sampleCategory
      );
      console.log(
        `Confirmation email: ${
          confirmationResult.success ? "SUCCESS" : "FAILED"
        }`
      );
      if (confirmationResult.messageId) {
        console.log(`Message ID: ${confirmationResult.messageId}`);
      }
    } catch (error) {
      console.log(`Confirmation email: FAILED - ${error.message}`);
    }

    console.log("3. Testing governing body notification...");
    try {
      const governmentResult = await emailService.sendIssueToGoverningBody(
        sampleIssue,
        sampleConsumer,
        sampleCategory
      );
      console.log(
        `Government notification: ${
          governmentResult.success ? "SUCCESS" : "FAILED"
        }`
      );
      if (governmentResult.messageId) {
        console.log(`Message ID: ${governmentResult.messageId}`);
      }
    } catch (error) {
      console.log(`Government notification: FAILED - ${error.message}`);
    }

    console.log("\nTest completed! Check your email for test messages.");
  } catch (error) {
    console.error("Test failed with error:", error.message);
  }
}

// Configuration check
function checkConfiguration() {
  console.log("Checking email configuration...");

  // Check SMTP configuration first
  if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS) {
    console.log(`SMTP_HOST: ${config.SMTP_HOST ? "SET" : "NOT SET"}`);
    console.log(`SMTP_USER: ${config.SMTP_USER ? "SET" : "NOT SET"}`);
    console.log(`SMTP_PASS: ${config.SMTP_PASS ? "SET" : "NOT SET"}`);
    console.log(`SENDER_EMAIL: ${config.SENDER_EMAIL ? "SET" : "NOT SET"}`);
    console.log(
      `GOVERNING_BODY_EMAIL: ${config.GOVERNING_BODY_EMAIL ? "SET" : "NOT SET"}`
    );
    console.log(`ADMIN_EMAIL: ${config.ADMIN_EMAIL ? "SET" : "NOT SET"}`);
    console.log("✅ SMTP Configuration found");
    console.log("");
    return true;
  }

  // Fallback to Gmail configuration
  if (config.EMAIL_USER && config.EMAIL_PASS) {
    console.log(`EMAIL_USER: ${config.EMAIL_USER ? "SET" : "NOT SET"}`);
    console.log(`EMAIL_PASS: ${config.EMAIL_PASS ? "SET" : "NOT SET"}`);
    console.log(
      `GOVERNING_BODY_EMAIL: ${config.GOVERNING_BODY_EMAIL ? "SET" : "NOT SET"}`
    );
    console.log(`ADMIN_EMAIL: ${config.ADMIN_EMAIL ? "SET" : "NOT SET"}`);
    console.log("✅ Gmail Configuration found");
    console.log("");
    return true;
  }

  // No configuration found
  console.log(`SMTP_HOST: ${config.SMTP_HOST ? "SET" : "NOT SET"}`);
  console.log(`SMTP_USER: ${config.SMTP_USER ? "SET" : "NOT SET"}`);
  console.log(`SMTP_PASS: ${config.SMTP_PASS ? "SET" : "NOT SET"}`);
  console.log(`EMAIL_USER: ${config.EMAIL_USER ? "SET" : "NOT SET"}`);
  console.log(`EMAIL_PASS: ${config.EMAIL_PASS ? "SET" : "NOT SET"}`);
  console.log("");

  console.log(
    "⚠️  Either SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) or Gmail credentials (EMAIL_USER, EMAIL_PASS) must be configured in .env file"
  );
  console.log("   See EMAIL_SETUP_GUIDE.md for setup instructions");
  return false;
}

// Run the test
console.log("=".repeat(50));
console.log("EMAIL SERVICE TEST SCRIPT");
console.log("=".repeat(50));

if (checkConfiguration()) {
  testEmailService();
} else {
  console.log("Please configure your email settings before running tests.");
}
