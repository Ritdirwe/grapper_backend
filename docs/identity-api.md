# Identity & Access Module - API Documentation

## Endpoints

### Authentication

#### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "phoneNumber": "+1234567890", // optional
  "name": "John Doe" // optional
}
```

**Response**:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "phoneNumber": "+1234567890",
    "role": "user",
    "emailVerified": false,
    "phoneVerified": false,
    "createdAt": "2026-01-08T00:24:32.000Z"
  }
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response**: Same as register

#### Verify Email

```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "userId": "uuid",
  "code": "123456"
}
```

**Response**:

```json
{
  "message": "Email verified successfully"
}
```

#### Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response**: Same as login

#### Forgot Password

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response**:

```json
{
  "message": "If the email exists, a reset code has been sent"
}
```

#### Reset Password

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "userId": "uuid",
  "code": "123456",
  "newPassword": "NewSecurePass123"
}
```

**Response**:

```json
{
  "message": "Password reset successfully"
}
```

#### Logout

```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response**:

```json
{
  "message": "Logged out successfully"
}
```

#### Get Current User

```http
POST /api/auth/me
Authorization: Bearer {accessToken}
```

**Response**:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "phoneNumber": "+1234567890",
  "role": "user",
  "emailVerified": true,
  "phoneVerified": false,
  "createdAt": "2026-01-08T00:24:32.000Z"
}
```

## Features Implemented

### Entities

- ✅ **User** - Core user entity with roles and status
- ✅ **RefreshToken** - JWT refresh token management
- ✅ **VerificationCode** - Email/phone/password reset codes

### Security

- ✅ **Argon2** password hashing
- ✅ **JWT** access tokens (7 days)
- ✅ **Refresh tokens** (30 days)
- ✅ **Token rotation** on refresh
- ✅ **Maximum 5 active tokens** per user

### Validation

- ✅ Email format validation
- ✅ Password strength (min 8 chars, uppercase, lowercase, number)
- ✅ Phone number E.164 format
- ✅ Verification code expiry (15 minutes)

### Guards & Decorators

- ✅ **@Public()** - Bypass authentication
- ✅ **@Roles(UserRole.ADMIN)** - Role-based access
- ✅ **@CurrentUser()** - Extract user from request
- ✅ **JwtAuthGuard** - Protect routes
- ✅ **RolesGuard** - Check user roles

## Usage Examples

### Protected Route

```typescript
@Controller("users")
export class UserController {
  @UseGuards(JwtAuthGuard)
  @Get("profile")
  getProfile(@CurrentUser() user: User) {
    return user;
  }
}
```

### Admin-Only Route

```typescript
@Controller("admin")
export class AdminController {
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get("users")
  getAllUsers() {
    // Only admins can access
  }
}
```

### Public Route

```typescript
@Controller("public")
export class PublicController {
  @Public()
  @Get("info")
  getInfo() {
    // Anyone can access
  }
}
```

## Database Schema

### users

- id (UUID, PK)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- phone_number (VARCHAR, UNIQUE, NULLABLE)
- role (ENUM: user, provider, admin)
- status (ENUM: active, suspended, banned, deleted)
- email_verified (BOOLEAN)
- phone_verified (BOOLEAN)
- last_login_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### refresh_tokens

- id (UUID, PK)
- user_id (UUID, FK → users)
- token (VARCHAR, UNIQUE)
- expires_at (TIMESTAMP)
- is_revoked (BOOLEAN)
- revoked_at (TIMESTAMP)
- user_agent (VARCHAR)
- ip_address (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### verification_codes

- id (UUID, PK)
- user_id (UUID)
- type (ENUM: email, phone, password_reset)
- code (VARCHAR(6))
- expires_at (TIMESTAMP)
- is_used (BOOLEAN)
- used_at (TIMESTAMP)
- email (VARCHAR)
- phone_number (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

## Next Steps

1. Set up email service for verification codes
2. Set up SMS service for phone verification
3. Add rate limiting for auth endpoints
4. Add account lockout after failed attempts
5. Implement 2FA (optional)
6. Add social auth (Google, Facebook, etc.)
