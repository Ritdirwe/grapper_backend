#!/usr/bin/env bash
set -euo pipefail

usage() {
	printf '%s\n' "Usage: pnpm db:reset -- --force"
}

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

FORCE=0
for arg in "$@"; do
	if [[ "$arg" == "--force" ]]; then
		FORCE=1
	fi
done

if [[ "$FORCE" -ne 1 ]]; then
	printf '%s\n' "Refusing to reset database without --force."
	usage
	exit 1
fi

required_vars=(DATABASE_HOST DATABASE_PORT DATABASE_USER DATABASE_PASSWORD DATABASE_NAME)
for var_name in "${required_vars[@]}"; do
	if [[ -z "${!var_name:-}" ]]; then
		printf '%s\n' "Missing required environment variable: $var_name"
		exit 1
	fi
done

printf '%s\n' "Resetting database schema on ${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME} as ${DATABASE_USER}"

export PGPASSWORD="${DATABASE_PASSWORD}"

psql \
	-h "${DATABASE_HOST}" \
	-p "${DATABASE_PORT}" \
	-U "${DATABASE_USER}" \
	-d "${DATABASE_NAME}" \
	-v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO CURRENT_USER;
GRANT ALL ON SCHEMA public TO public;
SQL

mark_all_migrations_as_applied() {
	local migration_dir="src/infrastructure/database/migrations"
	local migration_rows=""

	shopt -s nullglob
	for migration_file in "${migration_dir}"/*.ts; do
		local base_name ts_part suffix_part migration_name
		base_name="$(basename "$migration_file")"
		ts_part="${base_name%%-*}"
		suffix_part="${base_name#*-}"
		suffix_part="${suffix_part%.ts}"
		migration_name="${suffix_part}${ts_part}"

		if [[ -n "$migration_rows" ]]; then
			migration_rows+=$',\n'
		fi
		migration_rows+="(${ts_part}, '${migration_name}')"
	done
	shopt -u nullglob

	if [[ -z "$migration_rows" ]]; then
		printf '%s\n' "No migration files found to stamp."
		return
	fi

	psql \
		-h "${DATABASE_HOST}" \
		-p "${DATABASE_PORT}" \
		-U "${DATABASE_USER}" \
		-d "${DATABASE_NAME}" \
		-v ON_ERROR_STOP=1 <<SQL
CREATE TABLE IF NOT EXISTS "migrations" (
  "id" SERIAL NOT NULL,
  "timestamp" bigint NOT NULL,
  "name" character varying NOT NULL,
  CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id")
);

INSERT INTO "migrations" ("timestamp", "name")
SELECT v.ts, v.name
FROM (VALUES
${migration_rows}
) AS v(ts, name)
WHERE NOT EXISTS (
  SELECT 1 FROM "migrations" m WHERE m."timestamp" = v.ts
);
SQL
}

run_migrations_or_fallback() {
	printf '%s\n' "Running migrations..."
	if pnpm migration:run; then
		return 0
	fi

	printf '%s\n' "Migration run failed on fresh schema. Falling back to schema sync baseline..."
	pnpm schema:sync
	mark_all_migrations_as_applied
}

run_migrations_or_fallback

printf '%s\n' "Seeding database..."
pnpm seed

printf '%s\n' "Database reset, migrated, and seeded successfully."
