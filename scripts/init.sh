#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma db push --skip-generate

echo "Running seed..."
npm run db:seed

echo "Database initialized successfully!"
