#!/bin/sh
set -eu

# Verify the public contract after deploying the backend and Cloudflare route.
# This script never sends or reads a Turnstile secret.
base_url="${BASE_URL:-https://hub.vexlune.com}"
base_url="${base_url%/}"
nonce="$(printf '%s' "${VERIFY_NONCE:-vexlune-origin-smoke}" | shasum -a 256 | cut -c1-32)"
tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/vexlune-origin.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT INT TERM

settings_headers="$tmp_dir/settings.headers"
settings_body="$tmp_dir/settings.body"
invalid_headers="$tmp_dir/invalid.headers"
invalid_body="$tmp_dir/invalid.body"
bridge_headers="$tmp_dir/bridge.headers"
bridge_body="$tmp_dir/bridge.body"

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

invalid_status="$(curl -sS -o "$invalid_body" -D "$invalid_headers" -w '%{http_code}' "$base_url/mobile/captcha/turnstile?nonce=$nonce&action=admin")"
if [ "$invalid_status" != "400" ] || ! grep -q 'INVALID_TURNSTILE_CONTEXT' "$invalid_body"; then
  echo "invalid Turnstile action was not rejected (status=$invalid_status)" >&2
  exit 1
fi

bridge_status="$(curl -sS -o "$bridge_body" -D "$bridge_headers" -w '%{http_code}' "$base_url/mobile/captcha/turnstile?nonce=$nonce&action=login")"
bridge_type="$(awk 'tolower($0) ~ /^content-type:/ {print tolower($0); exit}' "$bridge_headers")"
if [ "$bridge_status" != "200" ] || ! printf '%s' "$bridge_type" | grep -q 'text/html'; then
  echo "Turnstile bridge is not HTML 200 (status=$bridge_status)" >&2
  exit 1
fi
if ! grep -q 'Security verification' "$bridge_body" || ! grep -q 'ReactNativeWebView' "$bridge_body"; then
  echo "Turnstile bridge body is missing the native handoff contract" >&2
  exit 1
fi
if grep -q 'Vexlune Mobile Console' "$bridge_body"; then
  echo "Turnstile path is still serving the embedded SPA" >&2
  exit 1
fi

echo "mobile origin contract passed: $base_url"
