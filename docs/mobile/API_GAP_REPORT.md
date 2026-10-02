# API Gap Report

Updated: 2026-10-03 (Asia/Shanghai).

## Repository authority

The delivery targets are the two Hinln repositories. GitHub metadata reports Hinln/sub2api as a private standalone repository (isFork=false, no parent) and Hinln/sub2api-mobile as a public fork of ckken/sub2api-mobile; the latter is still the requested delivery repository and is unrelated to the public Wei-Shaw/sub2api reference. The authenticated backend checkout is repos/sub2api at commit d9b37837920a1c812855bd95eb490486b1be29fd on main, with remote https://github.com/Hinln/sub2api.git.

## Audit conclusion

The private backend already provides the required email/password authentication primitives, role discovery, JWT/refresh rotation, TOTP, user/admin route families, response envelope, server-side audit middleware and server-side Cloudflare Turnstile verification. The mobile contract can be implemented against these source-verified paths.

The private backend now serves the first-party Turnstile WebView page required by the mobile brief. Hostname/action binding and replay/token consumption still need verifier hardening and staging evidence. Payment order creation remains outside the generic idempotency helper, so mobile retries cannot safely rely on Idempotency-Key until that contract is added.

## Cloudflare rule specification

The non-secret API/WAF/Turnstile rule blueprint is in CLOUDFLARE_MOBILE_API_RULES.md. Zone-specific deployment and staging evidence remain blocked until Cloudflare access/configuration is supplied.

## Remaining blockers

| ID | Gap | Why it blocks | Required closure |
|---|---|---|---|
| BLOCKED_PRIVATE_001 | Turnstile hostname/action/replay verification and staging evidence are incomplete | Native WebView page exists, but token binding is not proven against the production hostname/action or replay behavior. | Add server-side hostname/action allowlists, one-time nonce/token consumption and integration tests; validate through staging. |
| BLOCKED_PRIVATE_002 | Payment POST /api/v1/payment/orders does not consume Idempotency-Key | A mobile retry after timeout can create duplicate orders or produce ambiguous state. | Add durable idempotency record/unique scope, request fingerprint conflict (409), replay headers, audit event and integration tests. |
| BLOCKED_PRIVATE_003 | No deployed staging origin/Cloudflare rule export | Source proof cannot establish native API reachability, Cloudflare challenge behavior, CORS/CSP/WebView origin or first-party domain. | Provide a staging origin and sanitized Cloudflare/WAF rules; validate cf-mitigated: challenge, HTML challenge handling and Turnstile hostname/action. |
| BLOCKED_PRIVATE_004 | No QA user/admin accounts | Role routing, TOTP, payment, admin writes, rate limits and audit entries cannot be proven end-to-end. | Provision disposable staging accounts through a secure channel and revoke them after QA. |
| BLOCKED_PRIVATE_005 | Android/iOS signing and release environment absent | No production AAB/IPA/archive evidence can be produced. | Configure EAS/CI signing secrets and macOS/iOS runner; keep credentials out of the repositories. |

## Source-verified contract details

- Envelope: {code,message,reason?,metadata?,data?}; paginated data is data:{items,total,page,page_size,pages}.
- Login/register request fields are email/password plus optional turnstile_token; registration can additionally carry verify_code, promo, invitation and affiliate codes.
- Successful login/register returns Bearer access token, rotated refresh token, expiry seconds and a user DTO. If TOTP is enabled, login first returns a temporary token and masked email.
- GET /api/v1/auth/me is the role authority. The JWT middleware reloads the user, checks active status, token version and optional IP/UA session binding; admin middleware additionally requires user.IsAdmin().
- Public settings expose only Turnstile enable/site key and captcha public IDs. Admin settings expose configured booleans; secret fields are write-only and never returned. The current verifier still needs hostname/action policy checks for the native bridge.
- Auth entry points and refresh are Redis rate-limited with fail-close behavior; all auth events enter the audit middleware.
- Admin routes have global admin auth, audit and compliance middleware. A legacy x-api-key path remains for compatibility; Vexlune Hub must not use it.

## Confirmed mobile implementation gaps

- Existing mobile code still contains the old admin-* / x-api-key session path and must be replaced with SecureStore Bearer access/refresh tokens.
- User/admin role routing and the initial user workspace are implemented; payment/announcement/audit controls remain to be implemented and covered by contract tests. Turnstile bridge UI and route are implemented, with verifier hardening still open.
- Mobile transport must classify cf-mitigated: challenge and Cloudflare HTML before JSON parsing, then direct the user to the first-party WebView challenge.
- Every mutating payment/admin control must surface server errors, audit requirements, step-up requirements and idempotency outcomes; no optimistic success is allowed.

## Prompt package gaps

The supplied package still lacks prompts/06_Sub2API后端补齐与真实联调.md, prompts/07_测试安全性能_CI发布与最终验收.md, and the merged prompt named by MANIFEST.md. Their acceptance requirements are represented by Goal 6/7 in prompts/08 and prompts/09.

A row may be marked VERIFIED only after a real deployed endpoint/device test. Source inspection alone is recorded as PRIVATE_SOURCE_VERIFIED.
