#!/usr/bin/env bash
# Creates initial admin user (requires DATABASE_URL env var)
set -e
if [ -z "$DATABASE_URL" ]; then
  echo "Please set DATABASE_URL (e.g. postgres://user:pass@localhost:5432/db)"
  exit 1
fi
PW=$(openssl rand -base64 18)
echo "Creating default admin with username 'admin' and password: $PW"
# Note: This is a scaffold. In production you'd run a proper SQL insert using psql or a migration.
cat <<SQL
-- Run this SQL in your database (psql):
INSERT INTO users (id, username, email, password_hash, role, status)
VALUES (gen_random_uuid(), 'admin', 'admin@example.local', '$PW', 'admin', 'active');
SQL
echo "Change the password immediately via admin UI."
