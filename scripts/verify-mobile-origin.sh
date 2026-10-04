#!/bin/sh
set -eu

# Verify the public contract after deploying the backend and Cloudflare route.
# The probe uses only the official public settings endpoint and the first-party
# web auth pages. It never sends or reads a Turnstile secret and never calls a
# private mobile bridge.
base_url="${BASE_URL:-https://hub.vexlune.com}"
base_url="${base_url%/}"
tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/vexlune-origin.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT INT TERM

settings_headers="$tmp_dir/settings.headers"
settings_body="$tmp_dir/settings.body"
settings_status="$(curl -sS -o "$settings_body" -D "$settings_headers" -w '%{http_code}' "$base_url/api/v1/settings/public")"
settings_type="$(awk 'tolower($0) ~ /^content-type:/ {print tolower($0); exit}' "$settings_headers")"
if [ "$settings_status" != "200" ] || ! printf '%s' "$settings_type" | grep -q 'application/json'; then
  echo "settings endpoint is not JSON 200 (status=$settings_status)" >&2
  exit 1
fi
if ! grep -q '"turnstile_enabled"[[:space:]]*:[[:space:]]*true' "$settings_body"; then
  echo "turnstile_enabled is not true in public settings" >&2
  exit 1
fi
if grep -Eiq 'turnstile[_-]?secret|cf[_-]?clearance|x-api-key|"secret[_-]?key"' "$settings_body"; then
  echo "public settings exposed a secret or privileged credential" >&2
  exit 1
fi

for page in login register forgot-password mobile/turnstile; do
  page_file_key="$(printf '%s' "$page" | tr '/' '_')"
  page_headers="$tmp_dir/$page_file_key.headers"
  page_body="$tmp_dir/$page_file_key.body"
  page_status="$(curl -sS -o "$page_body" -D "$page_headers" -w '%{http_code}' "$base_url/$page")"
  page_type="$(awk 'tolower($0) ~ /^content-type:/ {print tolower($0); exit}' "$page_headers")"
  if [ "$page_status" != "200" ] || ! printf '%s' "$page_type" | grep -q 'text/html'; then
    echo "first-party auth page is not HTML 200 (page=$page status=$page_status)" >&2
    exit 1
  fi
  if ! grep -Eiq 'turnstile' "$page_body"; then
    echo "first-party page does not expose the configured Turnstile client (page=$page)" >&2
    exit 1
  fi
  if grep -Eiq 'turnstile[_-]?secret|cf[_-]?clearance|x-api-key|"secret[_-]?key"' "$page_body"; then
    echo "first-party auth page exposed a secret or privileged credential (page=$page)" >&2
    exit 1
  fi
done

echo "mobile origin contract passed: $base_url"
