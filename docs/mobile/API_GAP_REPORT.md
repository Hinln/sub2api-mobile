# API Gap Report

Updated: 2026-10-03 (Asia/Shanghai).

## Repository authority

The delivery targets are the two Hinln repositories. GitHub metadata reports Hinln/sub2api as a private standalone repository (isFork=false, no parent) and Hinln/sub2api-mobile as a public fork of ckken/sub2api-mobile; the latter is still the requested delivery repository and is unrelated to the public Wei-Shaw/sub2api reference. The authenticated backend checkout is repos/sub2api at local commit `aab6899` on branch `codex/backend-hardening`, with remote https://github.com/Hinln/sub2api.git.

## Audit conclusion

The private backend already provides the required email/password authentication primitives, role discovery, JWT/refresh rotation, TOTP, user/admin route families, response envelope, server-side audit middleware and server-side Cloudflare Turnstile verification. The mobile contract can be implemented against these source-verified paths.

The private backend now serves the first-party Turnstile WebView page required by the mobile brief. The bridge issues a Redis-backed five-minute nonce, binds action and request host, verifies Cloudflare action/hostname, and atomically consumes the nonce. Payment order creation now uses the shared durable idempotency coordinator with request-fingerprint conflicts and replay headers. Staging/device evidence is still required.

## Cloudflare rule specification

The non-secret API/WAF/Turnstile rule blueprint is in CLOUDFLARE_MOBILE_API_RULES.md. Zone-specific deployment and staging evidence remain blocked until Cloudflare access/configuration is supplied.

## Remaining blockers

| ID | Gap | Why it blocks | Required closure |
|---|---|---|---|
| CLOSED_PRIVATE_001 | Turnstile hostname/action/replay hardening | Redis-backed nonce issue/consume, strict Cloudflare action/hostname checks, browser widget action binding, and unit/repository tests are in backend commit `aab6899`. | Run staging/device verification against the real Cloudflare hostname. |
| CLOSED_PRIVATE_002 | Payment POST /api/v1/payment/orders idempotency | Shared durable coordinator now persists request fingerprints, rejects changed payloads with 409, replays stored responses, and records idempotency audit events. | Run a staging timeout/retry test with a real payment provider sandbox. |
| BLOCKED_PRIVATE_003 | No deployed staging origin/Cloudflare rule export | Source proof cannot establish native API reachability, Cloudflare challenge behavior, CORS/CSP/WebView origin or first-party domain. | Provide a staging origin and sanitized Cloudflare/WAF rules; validate cf-mitigated: challenge, HTML challenge handling and Turnstile hostname/action. |
| BLOCKED_PRIVATE_004 | No QA user/admin accounts | Role routing, TOTP, payment, admin writes, rate limits and audit entries cannot be proven end-to-end. | Provision disposable staging accounts through a secure channel and revoke them after QA. |
| BLOCKED_PRIVATE_005 | Android/iOS signing and release environment absent | No production AAB/IPA/archive evidence can be produced. | Configure native Gradle/Xcode signing secrets and macOS/Android runners; keep credentials out of the repositories. |

## Source-verified contract details

- Envelope: {code,message,reason?,metadata?,data?}; paginated data is data:{items,total,page,page_size,pages}.
- Login/register request fields are email/password plus optional turnstile_token; registration can additionally carry verify_code, promo, invitation and affiliate codes.
- Successful login/register returns Bearer access token, rotated refresh token, expiry seconds and a user DTO. If TOTP is enabled, login first returns a temporary token and masked email.
- GET /api/v1/auth/me is the role authority. The JWT middleware reloads the user, checks active status, token version and optional IP/UA session binding; admin middleware additionally requires user.IsAdmin().
- Public settings expose only Turnstile enable/site key and captcha public IDs. Admin settings expose configured booleans; secret fields are write-only and never returned. Native bridge verification now binds action, hostname and a Redis-backed one-shot nonce; deployed hostname evidence remains pending.
- Auth entry points and refresh are Redis rate-limited with fail-close behavior; all auth events enter the audit middleware.
- Admin routes have global admin auth, audit and compliance middleware. A legacy x-api-key path remains for compatibility; Vexlune Hub must not use it.

## Confirmed mobile implementation gaps

- Mobile authentication now uses SecureStore Bearer access/refresh tokens; the compatibility `adminApiKey` field is empty, rejected on writes, and never sent.
- User/admin role routing and the user workspace are implemented. API key CRUD, usage, announcements/read receipts, subscriptions and payment orders are connected to real endpoints; payment writes carry stable idempotency keys.
- Mobile transport must classify cf-mitigated: challenge and Cloudflare HTML before JSON parsing, then direct the user to the first-party WebView challenge.
- Every mutating payment/admin control must surface server errors, audit requirements, step-up requirements and idempotency outcomes; no optimistic success is allowed.

## Prompt package gaps

The supplied package still lacks prompts/06_Sub2API后端补齐与真实联调.md, prompts/07_测试安全性能_CI发布与最终验收.md, and the merged prompt named by MANIFEST.md. Their acceptance requirements are represented by Goal 6/7 in prompts/08 and prompts/09.

A row may be marked VERIFIED only after a real deployed endpoint/device test. Source inspection alone is recorded as PRIVATE_SOURCE_VERIFIED.
