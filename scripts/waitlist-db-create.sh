#!/usr/bin/env bash
set -euo pipefail

trim() {
	local s="$1"
	s="${s#"${s%%[![:space:]]*}"}"
	s="${s%"${s##*[![:space:]]}"}"
	printf '%s' "$s"
}

load_env_file() {
	local env_file="$1"
	[[ -f "$env_file" ]] || return 0

	while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
		local line
		line="$(trim "$raw_line")"

		[[ -z "$line" ]] && continue
		[[ "$line" == \#* ]] && continue

		if [[ "$line" == export* ]]; then
			line="${line#export}"
			line="$(trim "$line")"
		fi

		[[ "$line" == *"="* ]] || continue

		local key value
		key="$(trim "${line%%=*}")"
		value="${line#*=}"

		if [[ ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
			continue
		fi

		if [[ "$value" == \"*\" && "$value" == *\" ]]; then
			value="${value:1:${#value}-2}"
		elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
			value="${value:1:${#value}-2}"
		fi

		if [[ -n "$key" ]]; then
			export "$key=$value"
		fi
	done <"$env_file"
}

load_env_file ".env"
load_env_file ".env.local"

WAITLIST_DATABASE_HOST="${WAITLIST_DATABASE_HOST:-${DATABASE_HOST:-localhost}}"
WAITLIST_DATABASE_PORT="${WAITLIST_DATABASE_PORT:-${DATABASE_PORT:-5432}}"
WAITLIST_DATABASE_USER="${WAITLIST_DATABASE_USER:-${DATABASE_USER:-postgres}}"
WAITLIST_DATABASE_PASSWORD="${WAITLIST_DATABASE_PASSWORD:-${DATABASE_PASSWORD:-postgres}}"
WAITLIST_DATABASE_NAME="${WAITLIST_DATABASE_NAME:-gripper_waitlist}"

printf '%s\n' "Ensuring waitlist database exists: ${WAITLIST_DATABASE_NAME}"

export PGPASSWORD="${WAITLIST_DATABASE_PASSWORD}"

exists=$(psql -h "${WAITLIST_DATABASE_HOST}" -p "${WAITLIST_DATABASE_PORT}" -U "${WAITLIST_DATABASE_USER}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${WAITLIST_DATABASE_NAME}'")

if [[ "$exists" == "1" ]]; then
	printf '%s\n' "Waitlist database already exists"
	exit 0
fi

psql -h "${WAITLIST_DATABASE_HOST}" -p "${WAITLIST_DATABASE_PORT}" -U "${WAITLIST_DATABASE_USER}" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${WAITLIST_DATABASE_NAME}\";"

printf '%s\n' "Waitlist database created successfully"
