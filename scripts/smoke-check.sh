#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000/api}"
DRY_RUN="${DRY_RUN:-0}"

CUSTOMER_TOKEN="${CUSTOMER_TOKEN:-}"
PROVIDER_TOKEN="${PROVIDER_TOKEN:-}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

SERVICE_ID="${SERVICE_ID:-}"
BOOKING_ID="${BOOKING_ID:-}"
FILE_ID="${FILE_ID:-}"
MESSAGE_ID="${MESSAGE_ID:-}"
DISPUTE_ID="${DISPUTE_ID:-}"

pass_count=0
skip_count=0
fail_count=0

hr() {
  printf '\n%s\n' "------------------------------------------------------------"
}

log() {
  printf '%s\n' "$*"
}

ok() {
  pass_count=$((pass_count + 1))
  printf 'OK   %s\n' "$*"
}

skip() {
  skip_count=$((skip_count + 1))
  printf 'SKIP %s\n' "$*"
}

fail() {
  fail_count=$((fail_count + 1))
  printf 'FAIL %s\n' "$*"
}

require_var() {
  local var_name="$1"
  if [[ -z "${!var_name:-}" ]]; then
    return 1
  fi
  return 0
}

request() {
  local name="$1"
  local method="$2"
  local url="$3"
  local token="${4:-}"
  local data="${5:-}"
  local expected_regex="${6:-^2[0-9][0-9]$}"

  if [[ "$DRY_RUN" == "1" ]]; then
    ok "$name (dry-run)"
    return 0
  fi

  local tmp
  tmp="$(mktemp)"
  local code

  if [[ -n "$token" && -n "$data" ]]; then
    if ! code="$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$url" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$data")"; then
      fail "$name [network error]"
      rm -f "$tmp"
      return 0
    fi
  elif [[ -n "$token" ]]; then
    if ! code="$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$url" -H "Authorization: Bearer $token")"; then
      fail "$name [network error]"
      rm -f "$tmp"
      return 0
    fi
  elif [[ -n "$data" ]]; then
    if ! code="$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$data")"; then
      fail "$name [network error]"
      rm -f "$tmp"
      return 0
    fi
  else
    if ! code="$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$url")"; then
      fail "$name [network error]"
      rm -f "$tmp"
      return 0
    fi
  fi

  if [[ "$code" =~ $expected_regex ]]; then
    ok "$name [$code]"
  else
    fail "$name [$code]"
    log "Response: $(tr '\n' ' ' < "$tmp")"
  fi

  rm -f "$tmp"
}

multipart_upload() {
  local name="$1"
  local url="$2"
  local token="$3"
  local fixture_path="$4"

  if [[ "$DRY_RUN" == "1" ]]; then
    ok "$name (dry-run)"
    return 0
  fi

  local tmp
  tmp="$(mktemp)"
  local code
  if ! code="$(curl -sS -o "$tmp" -w "%{http_code}" -X POST "$url" -H "Authorization: Bearer $token" -F "file=@$fixture_path")"; then
    fail "$name [network error]"
    rm -f "$tmp"
    return 0
  fi
  if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then
    ok "$name [$code]"
  else
    fail "$name [$code]"
    log "Response: $(tr '\n' ' ' < "$tmp")"
  fi
  rm -f "$tmp"
}

hr
log "Smoke check starting"
log "BASE_URL=$BASE_URL"
log "DRY_RUN=$DRY_RUN"

if [[ "$DRY_RUN" == "0" ]]; then
  request "Health check" "GET" "$BASE_URL/health" "" "" "^2[0-9][0-9]$|^404$"
fi

hr
log "Booking workflow checks"
if require_var CUSTOMER_TOKEN && require_var SERVICE_ID; then
  request \
    "Create Paystack checkout" \
    "POST" \
    "$BASE_URL/bookings/checkout-paystack" \
    "$CUSTOMER_TOKEN" \
    "{\"serviceId\":\"$SERVICE_ID\",\"email\":\"customer@example.com\",\"redirectURL\":\"http://localhost:5173/bookings\"}" \
    "^201$"
else
  skip "Create Paystack checkout (needs CUSTOMER_TOKEN + SERVICE_ID)"
fi

if require_var PROVIDER_TOKEN && require_var BOOKING_ID; then
  request \
    "Provider deliver" \
    "POST" \
    "$BASE_URL/bookings/$BOOKING_ID/deliver" \
    "$PROVIDER_TOKEN" \
    "{\"note\":\"Initial delivery submitted\",\"attachments\":[\"https://cdn.example.com/output-v1.zip\"]}" \
    "^200$"
else
  skip "Provider deliver (needs PROVIDER_TOKEN + BOOKING_ID)"
fi

if require_var CUSTOMER_TOKEN && require_var BOOKING_ID; then
  request \
    "Customer request correction" \
    "POST" \
    "$BASE_URL/bookings/$BOOKING_ID/correction" \
    "$CUSTOMER_TOKEN" \
    "{\"description\":\"Please refine section 2\"}" \
    "^200$|^400$"
  request \
    "Customer approve delivery" \
    "POST" \
    "$BASE_URL/bookings/$BOOKING_ID/approve" \
    "$CUSTOMER_TOKEN" \
    "" \
    "^200$|^400$"
  request \
    "Completion payment paystack" \
    "POST" \
    "$BASE_URL/bookings/$BOOKING_ID/completion-payment-paystack" \
    "$CUSTOMER_TOKEN" \
    "" \
    "^201$|^400$"
  request \
    "Paid correction payment" \
    "POST" \
    "$BASE_URL/bookings/$BOOKING_ID/pay-correction" \
    "$CUSTOMER_TOKEN" \
    "" \
    "^201$|^400$"
else
  skip "Customer booking actions (needs CUSTOMER_TOKEN + BOOKING_ID)"
fi

hr
log "Workspace checks"
fixture_file="$(mktemp)"
printf 'smoke file\n' > "$fixture_file"
if require_var PROVIDER_TOKEN && require_var BOOKING_ID; then
  multipart_upload \
    "Upload booking file" \
    "$BASE_URL/bookings/$BOOKING_ID/files?fileType=deliverable" \
    "$PROVIDER_TOKEN" \
    "$fixture_file"
else
  skip "Upload booking file (needs PROVIDER_TOKEN + BOOKING_ID)"
fi
rm -f "$fixture_file"

if require_var CUSTOMER_TOKEN && require_var BOOKING_ID; then
  request "List booking files" "GET" "$BASE_URL/bookings/$BOOKING_ID/files" "$CUSTOMER_TOKEN" "" "^200$"
  request \
    "Send booking message" \
    "POST" \
    "$BASE_URL/bookings/$BOOKING_ID/messages" \
    "$CUSTOMER_TOKEN" \
    "{\"content\":\"Please confirm received files\",\"messageType\":\"text\"}" \
    "^201$"
  request \
    "List booking messages" \
    "GET" \
    "$BASE_URL/bookings/$BOOKING_ID/messages?page=1&limit=20" \
    "$CUSTOMER_TOKEN" \
    "" \
    "^200$"
else
  skip "Workspace list/message checks (needs CUSTOMER_TOKEN + BOOKING_ID)"
fi

if require_var PROVIDER_TOKEN && require_var BOOKING_ID && require_var MESSAGE_ID; then
  request \
    "Mark message read" \
    "PUT" \
    "$BASE_URL/bookings/$BOOKING_ID/messages/$MESSAGE_ID/read" \
    "$PROVIDER_TOKEN" \
    "" \
    "^204$"
else
  skip "Mark message read (needs PROVIDER_TOKEN + BOOKING_ID + MESSAGE_ID)"
fi

if require_var PROVIDER_TOKEN && require_var BOOKING_ID && require_var FILE_ID; then
  request \
    "Delete booking file" \
    "DELETE" \
    "$BASE_URL/bookings/$BOOKING_ID/files/$FILE_ID" \
    "$PROVIDER_TOKEN" \
    "" \
    "^204$"
else
  skip "Delete booking file (needs PROVIDER_TOKEN + BOOKING_ID + FILE_ID)"
fi

hr
log "Review guard check"
if require_var CUSTOMER_TOKEN && require_var SERVICE_ID; then
  request \
    "Create review" \
    "POST" \
    "$BASE_URL/reviews" \
    "$CUSTOMER_TOKEN" \
    "{\"serviceId\":\"$SERVICE_ID\",\"rating\":5,\"comment\":\"Great service\"}" \
    "^201$|^400$"
else
  skip "Create review (needs CUSTOMER_TOKEN + SERVICE_ID)"
fi

hr
log "Admin checks"
if require_var ADMIN_TOKEN; then
  request "Admin dashboard stats" "GET" "$BASE_URL/moderation/dashboard/stats" "$ADMIN_TOKEN" "" "^200$"
  request "Admin bookings list" "GET" "$BASE_URL/moderation/bookings?page=1&limit=20" "$ADMIN_TOKEN" "" "^200$"
  request "Admin payments list" "GET" "$BASE_URL/moderation/payments?page=1&limit=20" "$ADMIN_TOKEN" "" "^200$"
  request "Admin payments summary" "GET" "$BASE_URL/moderation/payments/summary?period=month" "$ADMIN_TOKEN" "" "^200$"
  request "Admin disputes list" "GET" "$BASE_URL/moderation/disputes?page=1&limit=20" "$ADMIN_TOKEN" "" "^200$"
else
  skip "Admin checks (needs ADMIN_TOKEN)"
fi

if require_var ADMIN_TOKEN && require_var BOOKING_ID; then
  request "Admin booking detail" "GET" "$BASE_URL/moderation/bookings/$BOOKING_ID" "$ADMIN_TOKEN" "" "^200$"
  request "Admin force refund booking" "PUT" "$BASE_URL/moderation/bookings/$BOOKING_ID/force-refund" "$ADMIN_TOKEN" "" "^204$|^404$"
else
  skip "Admin booking detail/refund (needs ADMIN_TOKEN + BOOKING_ID)"
fi

if require_var ADMIN_TOKEN && require_var DISPUTE_ID; then
  request \
    "Admin resolve dispute" \
    "PUT" \
    "$BASE_URL/moderation/disputes/$DISPUTE_ID/resolve" \
    "$ADMIN_TOKEN" \
    "{\"resolution\":\"Resolved by smoke check\",\"adminNotes\":\"Automated check\",\"refundAmount\":0}" \
    "^204$|^404$"
else
  skip "Admin resolve dispute (needs ADMIN_TOKEN + DISPUTE_ID)"
fi

hr
log "Smoke check complete"
log "Passed: $pass_count"
log "Skipped: $skip_count"
log "Failed: $fail_count"

if [[ "$fail_count" -gt 0 ]]; then
  exit 1
fi
