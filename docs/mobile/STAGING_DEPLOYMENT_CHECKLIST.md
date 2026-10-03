# Vexlune Hub staging deployment checklist

This checklist is the operator handoff for the private `Hinln/sub2api` backend and
the `hub.vexlune.com` Cloudflare zone. It contains no Turnstile secret, API token,
zone ID, database password or user credentials.

## 1. Pin and test the backend

Deploy backend PR #1 at commit `77d491747239fc4e5917732aa2ab24adbe128d9a` (source
branch `codex/backend-hardening`). Confirm the deployed binary reports the expected
commit before exposing it to the mobile client.

Run the repository's backend unit tests and migration checks in the same build
context used by staging. The migration must create `idempotency_records` and its
scope/key, expiry and status indexes before payment writes are enabled.

The server environment must provide the Turnstile secret through the existing
private settings mechanism. Never put it in the mobile repository, an app build,
Cloudflare client code, a WebView URL, or logs. Keep the public site key and the
configured hostname/action in the server's public settings response.

## 2. Cloudflare rules

Keep the origin private and retain WAF managed rules, DDoS protection, TLS/origin
validation, rate limits and bot signals. Add only the narrowly scoped browser
challenge exception required for JSON API clients:

```text
http.host eq "hub.vexlune.com"
and starts_with(http.request.uri.path, "/api/v1/")
```

This exception may skip only the browser-interactive challenge product that would
replace an API response with HTML. It must not skip WAF, DDoS, TLS, rate limiting,
bot signals or application authentication. Keep the first-party bridge path
explicitly routed to the backend:

```text
http.host eq "hub.vexlune.com"
and http.request.uri.path eq "/mobile/captcha/turnstile"
```

Do not use a User-Agent, custom mobile header, shared bypass secret or
`cf_clearance` cookie as an API bypass.

## 3. Origin smoke test

From a machine that can reach the staging hostname, run:

```bash
BASE_URL=https://hub.vexlune.com ./scripts/verify-mobile-origin.sh
```

The command must pass all of these checks:

- `GET /api/v1/settings/public` is JSON `200` and exposes only public Turnstile settings.
- An invalid bridge action returns `400` with `INVALID_TURNSTILE_CONTEXT`.
- A valid `login`, `register` or `forgot_password` bridge returns the minimal HTML bridge, not the SPA shell.
- The bridge HTML contains the native `ReactNativeWebView` handoff and no secret.
- `cf-mitigated: challenge` and unexpected HTML from API requests remain classified as challenge/configuration errors by the mobile client.

Then run device/staging tests with disposable ordinary-user and administrator
accounts. Verify one-time Turnstile token use, wrong action/origin rejection,
401 refresh, payment idempotency replay/conflict, audited administrator writes
and logout. Revoke the accounts after QA.

## 4. Rollback

If the probe fails or mobile traffic receives HTML from an API path, stop the
mobile rollout, restore the previous backend image and Cloudflare rules, and rerun
the probe before reopening traffic. Do not disable Cloudflare challenges globally
to hide a routing problem. Preserve the database migration and idempotency audit
records unless a separately reviewed rollback migration is required.
