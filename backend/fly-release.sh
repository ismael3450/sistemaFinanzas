#!/bin/sh
set -eu

echo "Running Prisma migrations with a 120s timeout..."
if timeout 120s pnpm prisma:migrate:prod; then
  echo "Prisma migrations completed."
else
  echo "Prisma migrations failed or timed out; continuing deployment." >&2
fi