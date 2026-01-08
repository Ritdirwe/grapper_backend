# Email & OTP Verification Setup

## Overview

The backend now includes a complete email service with OTP (One-Time Password) verification for:

- Email verification during registration
- Password reset flow
- Welcome emails

## Email Service Features

✅ **Nodemailer Integration** - Professional email sending  
✅ **HTML Email Templates** - Beautiful, responsive designs  
✅ **OTP Generation** - 6-digit codes with 15-minute expiry  
✅ **Development Mode** - Console logging when no SMTP configured  
✅ **Production Ready** - SMTP support for Gmail, SendGrid, AWS SES, etc.

---

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Email/SMTP Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM_NAME=Gripper Marketplace
MAIL_FROM_ADDRESS=noreply@gripper.com
```

### Gmail Setup (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Copy the 16-character password
3. **Update .env**:
   ```env
   MAIL_USER=your-email@gmail.com
   MAIL_PASSWORD=your-16-char-app-password
   ```

### Other SMTP Providers

#### SendGrid

```env
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USER=apikey
MAIL_PASSWORD=your-sendgrid-api-key
```

#### AWS SES

```env
MAIL_HOST=email-smtp.us-east-1.amazonaws.com
MAIL_PORT=587
MAIL_USER=your-ses-smtp-username
MAIL_PASSWORD=your-ses-smtp-password
```

#### Mailgun

```env
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USER=postmaster@your-domain.mailgun.org
MAIL_PASSWORD=your-mailgun-password
```

---

## Email Templates

### 1. Email Verification

Sent when a user registers:

- **Subject**: "Verify Your Email - Gripper Marketplace"
- **Content**: 6-digit OTP code
- **Expiry**: 15 minutes
- **Design**: Purple gradient header

### 2. Password Reset

Sent when user requests password reset:

- **Subject**: "Reset Your Password - Gripper Marketplace"
- **Content**: 6-digit reset code
- **Expiry**: 15 minutes
- **Design**: Pink/red gradient with warning

### 3. Welcome Email

Sent after email verification:

- **Subject**: "Welcome to Gripper Marketplace!"
- **Content**: Welcome message with CTA
- **Design**: Purple gradient with celebration emoji

---

## Testing OTP Flow

### Test 1: Registration with Email Verification

```bash
# 1. Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123"
  }' | jq .

# Save the user ID from response
USER_ID="paste-user-id-here"

# 2. Check email or server logs for OTP code
# In development mode (no SMTP), check terminal output:
# ============================================================
# 📧 EMAIL (Development Mode)
# To: newuser@example.com
# Subject: Verify Your Email - Gripper Marketplace
# Text: Your verification code is: 123456
# ============================================================

# 3. Verify email with OTP
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "code": "123456"
  }' | jq .

# 4. Now login should work
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123"
  }' | jq .
```

### Test 2: Password Reset with OTP

```bash
# 1. Request password reset
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com"
  }' | jq .

# 2. Check email/logs for reset code

# 3. Reset password with OTP
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "code": "654321",
    "newPassword": "NewSecurePass123"
  }' | jq .

# 4. Login with new password
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "NewSecurePass123"
  }' | jq .
```

---

## Development Mode

When `MAIL_USER` and `MAIL_PASSWORD` are not configured, emails are logged to console:

```
[EmailService] Email credentials not configured. Emails will be logged to console.
============================================================
📧 EMAIL (Development Mode)
To: user@example.com
Subject: Verify Your Email - Gripper Marketplace
From: Gripper Marketplace <noreply@gripper.com>
Text: Your verification code is: 123456

This code will expire in 15 minutes.

If you didn't request this code, please ignore this email.
============================================================
```

This is perfect for development and testing!

---

## Production Deployment

### 1. Choose Email Provider

**Recommended Options**:

- **SendGrid** - 100 emails/day free, easy setup
- **AWS SES** - $0.10 per 1000 emails, requires verification
- **Mailgun** - 5000 emails/month free
- **Gmail** - Free but limited (500/day), not recommended for production

### 2. Configure Environment

```bash
# Update production .env
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USER=apikey
MAIL_PASSWORD=your-production-api-key
MAIL_FROM_ADDRESS=noreply@yourdomain.com
```

### 3. Verify Domain (Recommended)

Most providers require domain verification for better deliverability:

1. Add SPF record to DNS
2. Add DKIM record to DNS
3. Verify domain in provider dashboard

---

## Email Service API

### Send Verification Code

```typescript
await emailService.sendVerificationCode(
  "user@example.com",
  "123456",
  "John Doe" // optional
);
```

### Send Password Reset

```typescript
await emailService.sendPasswordResetCode(
  "user@example.com",
  "654321",
  "John Doe" // optional
);
```

### Send Welcome Email

```typescript
await emailService.sendWelcomeEmail("user@example.com", "John Doe");
```

### Send Custom Email

```typescript
await emailService.sendEmail({
  to: "user@example.com",
  subject: "Custom Subject",
  html: "<h1>Custom HTML</h1>",
  text: "Plain text version",
});
```

---

## Security Features

✅ **OTP Expiry** - Codes expire after 15 minutes  
✅ **One-Time Use** - Codes can only be used once  
✅ **Secure Generation** - Cryptographically random 6-digit codes  
✅ **Rate Limiting** - (To be implemented) Prevent spam  
✅ **No Email Enumeration** - Same response for existing/non-existing emails

---

## Troubleshooting

### Emails Not Sending

1. **Check SMTP Credentials**

   ```bash
   # Test SMTP connection
   curl -v telnet://smtp.gmail.com:587
   ```

2. **Check Logs**

   ```bash
   # Look for email service errors
   tail -f logs/application.log | grep EmailService
   ```

3. **Verify Configuration**
   ```typescript
   // In development, check if credentials are loaded
   console.log(process.env.MAIL_USER); // Should not be undefined
   ```

### Gmail "Less Secure Apps"

Gmail no longer supports "less secure apps". You MUST use:

- App Passwords (with 2FA enabled)
- OAuth2 (more complex setup)

### Port Issues

- **Port 587**: TLS (recommended)
- **Port 465**: SSL (older, still works)
- **Port 25**: Unencrypted (not recommended)

---

## Next Steps

1. ✅ Email service implemented
2. ✅ OTP verification working
3. ✅ HTML templates created
4. ⏳ Add rate limiting for OTP requests
5. ⏳ Add SMS verification (Twilio integration)
6. ⏳ Add email templates for booking confirmations
7. ⏳ Add email templates for payment receipts

---

## Example Email Preview

### Verification Email

![Verification Email](https://via.placeholder.com/600x400/667eea/ffffff?text=Email+Verification+Template)

**Features**:

- Responsive design
- Large, easy-to-read OTP code
- Clear expiry information
- Professional branding
- Mobile-friendly

### Password Reset Email

![Password Reset](https://via.placeholder.com/600x400/f5576c/ffffff?text=Password+Reset+Template)

**Features**:

- Warning color scheme (red/pink)
- Security reminder
- Dashed border for emphasis
- Clear call-to-action
