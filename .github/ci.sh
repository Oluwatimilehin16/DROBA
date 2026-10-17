#!/usr/bin/env bash
# Runs every CI stage, logging each to ci-out/<n>-<name>.log, and keeps going after a failure
# so one run reports everything. Exit code is non-zero if any required stage failed.
set -uo pipefail
OUT="${CI_OUT:-ci-out}"
mkdir -p "$OUT"
SUMMARY="$OUT/summary.txt"
: > "$SUMMARY"
FAILED=0
N=0

stage() {
  local name="$1"; shift
  N=$((N + 1))
  local log
  log="$OUT/$(printf '%02d' "$N")-$name.log"
  local t0=$SECONDS
  echo "::group::$name"
  if "$@" > >(tee "$log") 2>&1; then
    echo "PASS  $name ($((SECONDS - t0))s)" | tee -a "$SUMMARY"
  else
    echo "FAIL  $name ($((SECONDS - t0))s)" | tee -a "$SUMMARY"
    FAILED=1
  fi
  echo "::endgroup::"
}

wait_for() { # url, seconds
  for _ in $(seq 1 "$2"); do curl -fsS "$1" > /dev/null 2>&1 && return 0; sleep 1; done
  echo "timed out waiting for $1"; return 1
}

echo "commit $(git rev-parse --short HEAD) $(git log -1 --pretty=%s)" >> "$SUMMARY"

stage install npm install --no-audit --no-fund
cp package-lock.json "$OUT/package-lock.json" 2>/dev/null || true
stage prisma-generate npm exec -w @droba/api -- prisma generate
stage prisma-validate npm exec -w @droba/api -- prisma validate
stage migrate npm exec -w @droba/api -- prisma migrate deploy
# Informational: anything Prisma's schema and the hand-written SQL disagree on (expected: only raw-SQL indexes)
stage schema-drift bash -c 'npm exec -w @droba/api -- prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script || true'
stage typecheck-shared npm run typecheck -w @droba/shared
stage typecheck-api npm run typecheck -w @droba/api
stage typecheck-web npm run typecheck -w @droba/web
# Tests get their own database and Redis db so screenshots show only the seed data
TEST_DB="postgresql://droba:droba@localhost:5432/droba_test?schema=public&connection_limit=30"
stage test-db bash -c "PGPASSWORD=droba psql -h localhost -U droba -d droba -c 'CREATE DATABASE droba_test' && DATABASE_URL='$TEST_DB' npm exec -w @droba/api -- prisma migrate deploy"
stage test-api env DATABASE_URL="$TEST_DB" REDIS_URL="redis://localhost:6379/1" npm test -w @droba/api -- --reporter=verbose
stage build-api npm run build -w @droba/api
stage build-web npm run build -w @droba/web
stage seed npm run db:seed -w @droba/api

# Boot the real servers for load and browser tests
( cd apps/api && RATE_LIMIT_DISABLED=true LOG_LEVEL=warn UV_THREADPOOL_SIZE=16 node dist/server.js > "../../$OUT/api-server.log" 2>&1 & )
( cd apps/web && npx next start -p 3000 > "../../$OUT/web-server.log" 2>&1 & )
stage wait-servers bash -c "$(declare -f wait_for); wait_for http://localhost:4000/health 60 && wait_for http://localhost:3000 90"

stage load-test env LOAD_REPORT="$PWD/$OUT/load-report.json" npm run load -w @droba/api
stage playwright-install npx -w @droba/web playwright install --with-deps chromium
stage screens env SCREENS_DIR="$PWD/$OUT/screens" npm run screens -w @droba/web

echo "---"; cat "$SUMMARY"
exit $FAILED
