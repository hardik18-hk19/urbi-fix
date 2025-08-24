# Email Service Setup Guide

## Overview
The UrbieFix application now includes email functionality to automatically notify governing bodies about high-priority issues and send confirmation emails to issue reporters.

## Features
- **Automatic Email Notifications**: High and urgent priority issues are automatically sent to the governing body
- **Confirmation Emails**: Users receive confirmation when they submit an issue
- **Manual Escalation**: Admins and users can manually send issues to governing bodies
- **Rich HTML Templates**: Professional email templates with all issue details
- **Attachment Support**: Images attached to issues are included in emails

## Setup Instructions

### 1. Environment Configuration
Copy the `.env.example` file to `.env` and configure the following variables:

```bash
# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here
GOVERNING_BODY_EMAIL=government@cityname.gov
ADMIN_EMAIL=admin@urbifix.com
EMERGENCY_HOTLINE=911
```

### 2. Gmail Setup (Recommended)
1. Create a Gmail account for the application
2. Enable 2-Factor Authentication
3. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password in `EMAIL_PASS`

### 3. Alternative Email Providers
For other email providers, uncomment and configure:
```bash
SMTP_HOST=smtp.your-email-provider.com
SMTP_PORT=587
SMTP_USER=your_email@provider.com
SMTP_PASS=your_password_here
```

### 4. Governing Body Configuration
- Set `GOVERNING_BODY_EMAIL` to the official government email
- Set `ADMIN_EMAIL` for CC notifications
- Update `EMERGENCY_HOTLINE` for urgent contact information

## API Endpoints

### Automatic Email Sending
Issues with priority 'high' or 'urgent' automatically trigger emails when created.

### Manual Email Sending
```
POST /api/issues/:issueId/send-to-government
Authorization: Bearer <token>

Body:
{
  "message": "Optional custom message",
  "urgent": true // Optional: mark as urgent regardless of original priority
}
```

### Test Email Service
```
GET /api/issues/admin/test-email
Authorization: Bearer <admin-token>
```

## Email Templates

### Governing Body Email Features:
- Professional HTML template with government branding
- Complete issue details including location, priority, and images
- Reporter information for follow-up
- Direct links to Google Maps for location
- Crowdfunding information if enabled
- Community engagement metrics
- Recommended actions for government response

### Confirmation Email Features:
- User-friendly confirmation of issue submission
- Issue tracking information
- Next steps explanation
- Dashboard link for tracking progress

## Usage Examples

### Testing Email Service
```javascript
// Test if email service is working
const response = await fetch('/api/issues/admin/test-email', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
```

### Manual Issue Escalation
```javascript
// Send specific issue to governing body
const response = await fetch(`/api/issues/${issueId}/send-to-government`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: "This issue requires immediate government attention",
    urgent: true
  })
});
```

## Troubleshooting

### Common Issues:
1. **Email not sending**: Check EMAIL_USER and EMAIL_PASS credentials
2. **Gmail authentication error**: Ensure app password is used, not regular password
3. **SMTP errors**: Verify SMTP settings for your email provider
4. **Permission denied**: Ensure user has appropriate role (admin/consumer)

### Error Handling:
The application gracefully handles email failures and continues processing even if emails cannot be sent. Email errors are logged but don't prevent issue creation.

## Security Considerations
- Use app passwords instead of regular passwords
- Store email credentials in environment variables
- Validate email addresses before sending
- Implement rate limiting for email sending
- Monitor email service usage and costs

## Customization

### Email Templates:
Templates can be customized in `server/services/email.service.js`:
- Modify HTML structure and styling
- Add/remove information sections
- Change branding and colors
- Customize priority handling

### Triggering Conditions:
Modify automatic email triggers in `server/controllers/issue.controller.js`:
- Change priority levels that trigger emails
- Add additional conditions (category, location, etc.)
- Implement different email types for different scenarios

## Monitoring and Analytics
- Email sending is logged with message IDs
- Failed email attempts are logged with error details
- Track email delivery success rates
- Monitor email service health with test endpoint
