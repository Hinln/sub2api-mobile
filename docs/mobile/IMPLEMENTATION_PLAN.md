# Vexlune Hub Mobile Implementation Plan

Updated: 2026-10-06 (Asia/Shanghai)

## Product boundary

Vexlune Hub is now an administrator-only iOS control console. It does not
serve ordinary users, registration, email/password login, user billing, user
usage, personal API keys, subscriptions, or end-user announcements. The first
screen accepts one official Sub2API Admin API Key.

The release contract remains the official Sub2API `v0.2.13` tag
(`3040209f205472038c1ba745a1bedd2edd9053b1`). The private `Hinln/sub2api`
checkout is audit material only. This product change does not authorize a
backend fork, migration, service restart, or production deployment.

## Admin Key contract

- Every admin request sends the credential in the exact lowercase-insensitive
  `x-api-key` HTTP header. The app does not send `Authorization` alongside it.
- `GET /api/v1/admin/settings/admin-api-key` is the one-shot validation request.
  A successful `{code: 0, data: {exists, masked_key}}` response is required
  before the key is persisted.
- `GET /api/v1/admin/settings/admin-api-key` and all `/api/v1/admin/*` routes
  are HTTPS requests to the configured Hub origin. The app never places the
  key in a URL, JSON body, analytics event, log, clipboard, or crash report.
- The key is stored only in iOS SecureStore/Keychain with
  `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Logout deletes it locally; the official
  API has no key-specific logout endpoint.
- `401 INVALID_ADMIN_KEY` (or a missing key) clears the local key and returns
  the app to the key screen. `403 FORBIDDEN` means the requested operation is
  not permitted and is not treated as successful. `423
  ADMIN_COMPLIANCE_ACK_REQUIRED` means the server-side compliance acceptance
  must be completed through the official admin flow; the app does not bypass
  or silently acknowledge it. `429` is rate limiting and is surfaced with the
  server retry hint where provided.

The official middleware also supports an administrator JWT, but the Vexlune
Hub product intentionally does not expose an email/password or JWT login path.
The compatibility code must not be described as a product authentication
option.

## Goal status after the product pivot

| Goal | Scope | Status and evidence |
|---|---|---|
| 0 | Repository/build baseline | Complete locally; preserve the user-owned `ios/VexluneMobileConsole/Info.plist` modification. |
| 1 | Official admin route and DTO audit | Complete from official `v0.2.13` source; matrix in `API_COVERAGE_MATRIX.md`. |
| 2 | Admin Key session boundary | Implemented locally: one key screen, `x-api-key`, SecureStore, query/session clearing. |
| 3 | Admin-only routing and errors | Implemented locally: no register/forgot/password user entry; 401/403/423 handling is fail-closed. |
| 4 | Admin workspace | Existing admin dashboard, accounts, users, groups, logs, settings and detail screens remain in scope when backed by official admin routes. |
| 5 | High-risk operations | Server permissions, audit, compliance and any step-up remain authoritative; the app cannot grant itself access. |
| 6 | Cloudflare/Turnstile | Admin Key validation does not add a private captcha route. Existing public challenge diagnostics remain documented separately; production dedicated-route deployment is still pending. |
| 7 | QA/security | Local source tests and scans are required; real production key validation is not claimed without an approved run. |
| 8 | Native iOS release | Xcode workspace/archive/IPA evidence exists locally. Android remains deferred and Expo/EAS cloud builds are not used. |

## Implementation rules

1. Keep the production backend at official `v0.2.13`; use only its documented
   admin middleware and routes.
2. Keep administrator credentials inside SecureStore and redact all errors and
   telemetry. Never print a complete key while diagnosing a request.
3. Use the server response as the permission truth. A hidden route or local
   `role` flag cannot turn a 401, 403, or 423 response into success.
4. Only repeat safe idempotent reads automatically. For writes, use an
   official idempotency contract or query the server before offering a retry.
5. Preserve the user’s uncommitted Info.plist change. Do not modify production
   files, Cloudflare rules/secrets, databases, or service state as part of a
   local build.

## Remaining release proof

- Run a real, revocable Admin Key against an approved non-production or
  production-read-only account and record only status, reason code and request
  ID (never the key).
- Verify one read-only dashboard request, one rejected/expired-key path, one
  compliance 423 path when applicable, logout/key deletion, and cold-start
  SecureStore hydration on an iOS device.
- Keep the production `/mobile/turnstile` route deployment issue separate from
  Admin Key authentication. No deployment or server change is implied here.
