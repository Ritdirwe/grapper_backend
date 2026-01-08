# User Management Module - API Documentation

## Overview

The User Management module handles user profiles, provider profiles, payout methods, and user preferences.

---

## Endpoints

### Profile Management

#### Get My Profile

```http
GET /api/profiles/me
Authorization: Bearer {accessToken}
```

**Response**:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "fullName": "John Doe",
  "displayName": "johndoe",
  "bio": "Full-stack developer",
  "avatarUrl": "https://example.com/avatar.jpg",
  "coverImageUrl": "https://example.com/cover.jpg",
  "birthdate": "1990-01-01",
  "gender": "male",
  "location": "New York, USA",
  "country": "USA",
  "city": "New York",
  "website": "https://johndoe.com",
  "socialLinks": {
    "twitter": "https://twitter.com/johndoe",
    "linkedin": "https://linkedin.com/in/johndoe"
  },
  "verificationStatus": "verified",
  "isVerified": true,
  "strikeCount": 0,
  "isFeatured": false,
  "followersCount": 150,
  "followingCount": 200,
  "createdAt": "2026-01-08T00:00:00.000Z",
  "updatedAt": "2026-01-08T00:00:00.000Z"
}
```

#### Update My Profile

```http
PUT /api/profiles/me
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "fullName": "John Doe",
  "displayName": "johndoe",
  "bio": "Full-stack developer passionate about NestJS",
  "avatarUrl": "https://example.com/new-avatar.jpg",
  "location": "San Francisco, USA",
  "country": "USA",
  "city": "San Francisco",
  "website": "https://johndoe.dev",
  "socialLinks": {
    "twitter": "https://twitter.com/johndoe",
    "linkedin": "https://linkedin.com/in/johndoe",
    "github": "https://github.com/johndoe"
  }
}
```

#### Get Public Profile

```http
GET /api/profiles/:userId
```

**Response**: Same as "Get My Profile"

---

## Entities

### Profile

- **Purpose**: User's public profile information
- **Features**:
  - Personal information (name, bio, avatar)
  - Social links
  - Verification status
  - Strike count (for moderation)
  - Followers/following counts
  - Featured status

### ProviderProfile

- **Purpose**: Additional information for service providers
- **Features**:
  - Business information
  - Skills and certifications
  - Portfolio
  - Hourly rate
  - Availability hours
  - Performance metrics (completion rate, earnings, ratings)

### PayoutMethod

- **Purpose**: Payment information for providers
- **Supported Providers**:
  - Stripe
  - Paystack
  - Bank Transfer
- **Features**:
  - Account verification
  - Default payment method
  - Multiple payout methods per user

### UserPreferences

- **Purpose**: User settings and preferences
- **Features**:
  - Language, timezone, currency
  - Notification preferences (email, push, SMS)
  - Privacy settings
  - Custom settings (JSONB)

---

## Testing with Curl

### 1. Get My Profile

```bash
# Use access token from login
ACCESS_TOKEN="your-access-token"

curl -X GET http://localhost:3000/api/profiles/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

### 2. Update Profile

```bash
curl -X PUT http://localhost:3000/api/profiles/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "displayName": "johndoe",
    "bio": "Full-stack developer",
    "location": "New York, USA",
    "country": "USA",
    "city": "New York"
  }' | jq .
```

### 3. Get Public Profile

```bash
# Get another user's profile (public)
USER_ID="some-user-id"

curl -X GET http://localhost:3000/api/profiles/$USER_ID | jq .
```

---

## Features Implemented

### Profile Management ✅

- [x] Auto-create profile on first access
- [x] Update profile information
- [x] Public profile viewing
- [x] Social links support
- [x] Verification status tracking
- [x] Strike count for moderation

### Validation ✅

- [x] URL validation for avatar, cover, website
- [x] Date validation for birthdate
- [x] Enum validation for gender
- [x] Optional fields support

### Business Logic ✅

- [x] `isVerified()` - Check verification status
- [x] `canProvideServices()` - Check if user can offer services
- [x] `incrementStrike()` - Add moderation strike
- [x] `resetStrikes()` - Clear strikes

---

## Database Schema

### profiles

- id (UUID, PK)
- user_id (UUID, FK → users, UNIQUE)
- full_name (VARCHAR)
- display_name (VARCHAR)
- bio (TEXT)
- avatar_url (VARCHAR)
- cover_image_url (VARCHAR)
- birthdate (DATE)
- gender (ENUM)
- location (VARCHAR)
- country (VARCHAR)
- city (VARCHAR)
- website (VARCHAR)
- social_links (JSONB)
- verification_status (ENUM)
- verification_document_url (VARCHAR)
- verified_at (TIMESTAMP)
- strike_count (INTEGER, DEFAULT 0)
- is_featured (BOOLEAN, DEFAULT false)
- followers_count (INTEGER, DEFAULT 0)
- following_count (INTEGER, DEFAULT 0)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### provider_profiles

- id (UUID, PK)
- user_id (UUID, FK → users, UNIQUE)
- business_name (VARCHAR)
- description (TEXT)
- skills (JSONB)
- certifications (JSONB)
- years_of_experience (INTEGER)
- portfolio (JSONB)
- hourly_rate (DECIMAL)
- currency (VARCHAR)
- response_time_hours (INTEGER)
- completion_rate (DECIMAL)
- total_earnings (DECIMAL)
- total_jobs (INTEGER)
- average_rating (DECIMAL)
- total_reviews (INTEGER)
- is_available (BOOLEAN)
- availability_hours (JSONB)
- last_active_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### payout_methods

- id (UUID, PK)
- user_id (UUID, FK → users)
- provider (ENUM: stripe, paystack, bank_transfer)
- account_name (VARCHAR)
- account_number (VARCHAR)
- bank_name (VARCHAR)
- bank_code (VARCHAR)
- stripe_account_id (VARCHAR)
- paystack_recipient_code (VARCHAR)
- currency (VARCHAR)
- is_verified (BOOLEAN)
- is_default (BOOLEAN)
- metadata (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### user_preferences

- id (UUID, PK)
- user_id (UUID, FK → users, UNIQUE)
- language (VARCHAR, DEFAULT 'en')
- timezone (VARCHAR, DEFAULT 'UTC')
- currency (VARCHAR, DEFAULT 'USD')
- email_notifications (BOOLEAN, DEFAULT true)
- push_notifications (BOOLEAN, DEFAULT true)
- sms_notifications (BOOLEAN, DEFAULT false)
- marketing_emails (BOOLEAN, DEFAULT true)
- booking_reminders (BOOLEAN, DEFAULT true)
- message_notifications (BOOLEAN, DEFAULT true)
- review_notifications (BOOLEAN, DEFAULT true)
- payment_notifications (BOOLEAN, DEFAULT true)
- show_online_status (BOOLEAN, DEFAULT true)
- show_profile_to_search (BOOLEAN, DEFAULT true)
- allow_messages_from_anyone (BOOLEAN, DEFAULT false)
- custom_settings (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

---

## Next Steps

### To Implement:

1. **Provider Profile Endpoints**

   - GET /api/provider-profiles/me
   - PUT /api/provider-profiles/me
   - POST /api/provider-profiles/portfolio (add portfolio item)

2. **Payout Methods Endpoints**

   - GET /api/payout-methods
   - POST /api/payout-methods
   - PUT /api/payout-methods/:id
   - DELETE /api/payout-methods/:id
   - POST /api/payout-methods/:id/verify

3. **User Preferences Endpoints**

   - GET /api/preferences
   - PUT /api/preferences

4. **Profile Features**
   - Upload avatar/cover image
   - Verification document upload
   - Follow/unfollow users
   - Search profiles

---

## Summary

✅ **User Management module is functional**

**Implemented**:

- Profile entity with verification
- Provider profile with stats
- Payout methods for payments
- User preferences for settings
- Profile service with CRUD
- Profile controller with 3 endpoints
- Auto-create profile on first access
- Public profile viewing

**Status**: Ready for integration with other modules
