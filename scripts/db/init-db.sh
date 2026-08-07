#!/bin/bash

# Initialize test database
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set. Using default test database."
  export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/flow4jira_test"
fi

echo "Waiting for Postgres to be ready..."
until psql "$DATABASE_URL" -c '\q' 2>/dev/null; do
  echo "Postgres is unavailable - sleeping"
  sleep 2
done

echo "Postgres is ready!"
echo "Running migrations..."
pnpm prisma migrate deploy

echo "Database initialized successfully!"
