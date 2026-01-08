# Admin User Management API

## Overview

Admin endpoints for managing users, profiles, verification, and moderation.

**Access**: Admin role required (`@Roles(UserRole.ADMIN)`)

---

## Endpoints

### 1. Get All Users (Paginated)

```http
GET /api/admin/users?page=1&limit=20&search=john&role=provider&status=active
Authorization: Bearer {admin-access-token}
```

**Query Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by email, full name, or display name
- `role` (optional): Filter by role (user, provider, admin)
- `status` (optional): Filter by status (active, suspended, banned, deleted)
- `verificationStatus` (optional): Filter by verification (unverified, pending, verified, rejected)

**Response**:

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "phoneNumber": "+1234567890",
      "role": "provider",
      "status": "active",
      "emailVerified": true,
      "phoneVerified": false,
      "lastLoginAt": "2026-01-08T00:00:00.000Z",
      "createdAt": "2026-01-08T00:00:00.000Z",
      "profile": {
        "fullName": "John Doe",
        "displayName": "johndoe",
        "verificationStatus": "verified",
        "strikeCount": 0,
        "isFeatured": false
      }
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

### 2. Get User by ID

```http
GET /api/admin/users/:userId
Authorization: Bearer {admin-access-token}
```

### 3. Update User

```http
PUT /api/admin/users/:userId
Authorization: Bearer {admin-access-token}
Content-Type: application/json

{
  "role": "provider",
  "status": "active"
}
```

### 4. Update Profile

```http
PUT /api/admin/users/:userId/profile
Authorization: Bearer {admin-access-token}
Content-Type: application/json

{
  "verificationStatus": "verified",
  "strikeCount": 0,
  "isFeatured": true
}
```

### 5. Suspend User

```http
POST /api/admin/users/:userId/suspend
Authorization: Bearer {admin-access-token}
```

### 6. Ban User

```http
POST /api/admin/users/:userId/ban
Authorization: Bearer {admin-access-token}
```

### 7. Activate User

```http
POST /api/admin/users/:userId/activate
Authorization: Bearer {admin-access-token}
```

### 8. Verify Profile

```http
POST /api/admin/users/:userId/verify
Authorization: Bearer {admin-access-token}
```

### 9. Reject Verification

```http
POST /api/admin/users/:userId/reject-verification
Authorization: Bearer {admin-access-token}
```

### 10. Add Strike

```http
POST /api/admin/users/:userId/strikes/add
Authorization: Bearer {admin-access-token}
```

### 11. Remove Strike

```http
POST /api/admin/users/:userId/strikes/remove
Authorization: Bearer {admin-access-token}
```

### 12. Reset Strikes

```http
POST /api/admin/users/:userId/strikes/reset
Authorization: Bearer {admin-access-token}
```

### 13. Toggle Featured Status

```http
POST /api/admin/users/:userId/toggle-featured
Authorization: Bearer {admin-access-token}
```

---

## Testing with Curl

### 1. Create Admin User (First Time Setup)

```bash
# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPass123"
  }' | jq .

# Manually update user role in database
psql -U postgres -d gripper_marketplace -c \
  "UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';"

# Verify email (get code from logs)
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "admin-user-id",
    "code": "123456"
  }' | jq .

# Login as admin
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPass123"
  }')

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | jq -r '.accessToken')
echo "Admin Token: $ADMIN_TOKEN"
```

### 2. List All Users

```bash
curl -X GET "http://localhost:3000/api/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 3. Search Users

```bash
curl -X GET "http://localhost:3000/api/admin/users?search=john&role=provider" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 4. Get Specific User

```bash
USER_ID="some-user-id"

curl -X GET "http://localhost:3000/api/admin/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 5. Suspend User

```bash
curl -X POST "http://localhost:3000/api/admin/users/$USER_ID/suspend" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 6. Ban User

```bash
curl -X POST "http://localhost:3000/api/admin/users/$USER_ID/ban" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 7. Activate User

```bash
curl -X POST "http://localhost:3000/api/admin/users/$USER_ID/activate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 8. Verify Profile

```bash
curl -X POST "http://localhost:3000/api/admin/users/$USER_ID/verify" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 9. Add Strike

```bash
curl -X POST "http://localhost:3000/api/admin/users/$USER_ID/strikes/add" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 10. Reset Strikes

```bash
curl -X POST "http://localhost:3000/api/admin/users/$USER_ID/strikes/reset" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 11. Make User Featured

```bash
curl -X POST "http://localhost:3000/api/admin/users/$USER_ID/toggle-featured" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 12. Update User Role

```bash
curl -X PUT "http://localhost:3000/api/admin/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "provider"
  }' | jq .
```

---

## Features

### User Management ✅

- [x] List all users with pagination
- [x] Search users by email/name
- [x] Filter by role, status, verification
- [x] Get user details
- [x] Update user role
- [x] Update user status

### Moderation ✅

- [x] Suspend user (temporary)
- [x] Ban user (permanent)
- [x] Activate user (restore access)
- [x] Add/remove/reset strikes
- [x] Strike count tracking

### Verification ✅

- [x] Verify user profile
- [x] Reject verification
- [x] Set verified_at timestamp
- [x] Track verification status

### Features ✅

- [x] Toggle featured status
- [x] Featured users highlighting

### Security ✅

- [x] Admin-only access (@Roles guard)
- [x] Prevent demoting last admin
- [x] JWT authentication required

---

## Business Rules

1. **Last Admin Protection**: Cannot demote the last active admin
2. **Strike System**: 3 strikes = cannot provide services
3. **Verification**: Only verified providers can offer services
4. **Status Hierarchy**: Banned > Suspended > Active
5. **Featured Users**: Manually curated by admins

---

## Admin Responsibilities

### User Moderation

- Review and verify provider profiles
- Manage user strikes for policy violations
- Suspend/ban users for serious violations
- Activate previously suspended accounts

### Content Moderation

- Feature quality providers
- Remove featured status for policy violations
- Monitor user activity and complaints

### User Support

- Update user information when needed
- Reset strikes after appeals
- Verify identity documents

---

## Summary

✅ **13 admin endpoints** for complete user management  
✅ **Role-based access control** (admin only)  
✅ **Pagination & filtering** for user lists  
✅ **Strike system** for moderation  
✅ **Verification workflow** for providers  
✅ **Featured users** management

**Status**: Ready for production use
