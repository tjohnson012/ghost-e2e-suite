#!/usr/bin/env bash
# Plays the client's role: creates the staging admin account you were "given".
set -e
URL=${GHOST_URL:-http://localhost:2368}
curl -s -X POST "$URL/ghost/api/admin/authentication/setup/" \
  -H 'Content-Type: application/json' -H "Origin: $URL" \
  -d '{"setup":[{"name":"QA Admin","email":"qa-admin@example.com","password":"Staging-Pass-2026!","blogTitle":"Dry Run Publication"}]}' \
  | grep -q '"users"' && echo "admin created" || echo "admin already exists (fine)"
