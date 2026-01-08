# Authentication API - Curl Test Commands

## Quick Reference

All endpoints tested and working! ✅

---

## 1. Health Check

```bash
curl http://localhost:3000/api/health | jq .
```

---

## 2. Register New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123",
    "name": "New User",
    "phoneNumber": "+1234567890"
  }' | jq .
```

**Save the accessToken and refreshToken from the response!**

---

## 3. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }' | jq .
```

**Note**: Will fail with "Please verify your email first" until email is verified.

---

## 4. Get Current User (Protected)

```bash
# Replace YOUR_ACCESS_TOKEN with actual token
curl -X POST http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" | jq .
```

---

## 5. Verify Email

```bash
# Check server logs for the 6-digit code
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "code": "123456"
  }' | jq .
```

---

## 6. Forgot Password

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }' | jq .
```

---

## 7. Reset Password

```bash
# Check server logs for the 6-digit code
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "code": "123456",
    "newPassword": "NewSecurePass123"
  }' | jq .
```

---

## 8. Refresh Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }' | jq .
```

---

## 9. Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }' | jq .
```

---

## Complete Test Flow

### Step 1: Register

```bash
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "flow@example.com",
    "password": "FlowTest123"
  }')

echo $RESPONSE | jq .

# Extract tokens
ACCESS_TOKEN=$(echo $RESPONSE | jq -r '.accessToken')
REFRESH_TOKEN=$(echo $RESPONSE | jq -r '.refreshToken')
USER_ID=$(echo $RESPONSE | jq -r '.user.id')

echo "Access Token: $ACCESS_TOKEN"
echo "Refresh Token: $REFRESH_TOKEN"
echo "User ID: $USER_ID"
```

### Step 2: Get Profile

```bash
curl -X POST http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

### Step 3: Try Login (Will Fail - Email Not Verified)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "flow@example.com",
    "password": "FlowTest123"
  }' | jq .
```

### Step 4: Check Server Logs for Verification Code

```bash
# Look for: "Verification code for flow@example.com: XXXXXX"
```

### Step 5: Verify Email

```bash
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"code\": \"PASTE_CODE_HERE\"
  }" | jq .
```

### Step 6: Login (Should Work Now)

```bash
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "flow@example.com",
    "password": "FlowTest123"
  }')

echo $LOGIN_RESPONSE | jq .

# Update tokens
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.refreshToken')
```

### Step 7: Refresh Token

```bash
REFRESH_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")

echo $REFRESH_RESPONSE | jq .

# Update tokens again
ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.accessToken')
REFRESH_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.refreshToken')
```

### Step 8: Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }" | jq .
```

---

## Error Testing

### Invalid Email Format

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "SecurePass123"
  }' | jq .
```

### Weak Password

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "weak@example.com",
    "password": "weak"
  }' | jq .
```

### Wrong Password

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "WrongPassword"
  }' | jq .
```

### Invalid Token

```bash
curl -X POST http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer invalid.token.here" | jq .
```

### Duplicate Email

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "AnotherPass123"
  }' | jq .
```

---

## Test Results Summary

✅ **All 8 endpoints tested successfully**

| Endpoint                    | Method | Status     | Notes                          |
| --------------------------- | ------ | ---------- | ------------------------------ |
| `/api/health`               | GET    | ✅ Working | Database connected             |
| `/api/auth/register`        | POST   | ✅ Working | Argon2 hashing, JWT generation |
| `/api/auth/login`           | POST   | ✅ Working | Email verification check       |
| `/api/auth/verify-email`    | POST   | ✅ Working | 6-digit codes, 15min expiry    |
| `/api/auth/refresh`         | POST   | ✅ Working | Token rotation                 |
| `/api/auth/forgot-password` | POST   | ✅ Working | No email enumeration           |
| `/api/auth/reset-password`  | POST   | ✅ Working | Code validation                |
| `/api/auth/logout`          | POST   | ✅ Working | Token revocation               |
| `/api/auth/me`              | POST   | ✅ Working | JWT guard protection           |

---

## Notes

- Verification codes are logged to console in development
- Email verification required before login
- Tokens expire: Access (7 days), Refresh (30 days)
- Maximum 5 active refresh tokens per user
- Password must have: 8+ chars, uppercase, lowercase, number
- Phone number format: E.164 (+1234567890)
