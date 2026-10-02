# API Coverage Matrix

Updated: 2026-10-03 (Asia/Shanghai).

The delivery targets are Hinln/sub2api-mobile and the private standalone Hinln/sub2api. Wei-Shaw/sub2api is reference-only. Statuses distinguish source evidence from deployed-device evidence:

- PRIVATE_SOURCE_VERIFIED: route, middleware and DTO are present in the authenticated private checkout; this is not a staging/device proof.
- PRIVATE_SOURCE_VERIFIED_WITH_GAP: source route exists, but deployment evidence or an explicitly documented compatibility gap remains.
- PRIVATE_BLOCKED: the requested contract is absent from the private checkout or deployment evidence is unavailable.
- MOBILE_PENDING: the private contract exists, but the mobile implementation or contract test is unfinished.
- VERIFIED: real staging/device evidence exists (none yet in this audit).
- SNAPSHOT_ONLY: reference snapshot only.

## Auth, settings and Cloudflare

| Area | Screen/control | Method/path | Request/response contract and permission | Error/edge behavior | Private evidence | Status |
|---|---|---|---|---|---|---|
| Auth | public settings | GET /api/v1/settings/public | Public. Returns registration/email verification/password reset/TOTP/passkey flags, login agreement, turnstile_enabled, turnstile_site_key, public captcha IDs, branding, payment and feature flags. Never returns Turnstile secret. | Public IP limiter; DB/settings failure is an error. | server/routes/auth.go; handler/setting_handler.go; handler/dto/settings.go:362 | PRIVATE_SOURCE_VERIFIED |
| Auth | email/password login | POST /api/v1/auth/login | Public, Redis fail-close rate limit (20/min). JSON: email, password, optional turnstile_token + turnstile_nonce/Tencent proof. Success: access_token, refresh_token, expires_in, token_type=Bearer, user; TOTP users receive requires_2fa, temp_token, user_email_masked. | Captcha provider selection is server-owned; 401/403/429; backend mode may allow admins only. | handler/auth_handler.go; server/routes/auth.go:35-40 | PRIVATE_SOURCE_VERIFIED |
| Auth | TOTP login | POST /api/v1/auth/login/2fa | Public temp-session flow. JSON: temp_token, six-digit totp_code; returns the same token pair/user DTO after verification. | Expired temp token, invalid code, inactive user, revoked token; rate limit 20/min. | handler/auth_handler.go:294-423; server/routes/auth.go:41-43 | PRIVATE_SOURCE_VERIFIED |
| Auth | registration | POST /api/v1/auth/register | Public, rate limit 5/min. JSON: email, password, optional verify_code, turnstile_token/turnstile_nonce, promo/invitation/affiliate codes. Returns token pair/user. | Registration switch, suffix/domain quota, duplicate email, required email verification/captcha; captcha is skipped only when server email verification already consumed the proof. | handler/auth_handler.go; service/auth_service.go | PRIVATE_SOURCE_VERIFIED |
| Auth | send email code | POST /api/v1/auth/send-verify-code | Public, rate limit 5/min. JSON: email and captcha proof; response message, countdown. | Captcha required according to active provider; cooldown/429; email service errors. | handler/auth_handler.go:61-75,212-237; server/routes/auth.go:50-52 | PRIVATE_SOURCE_VERIFIED |
| Auth | refresh | POST /api/v1/auth/refresh | Public rate-limited (30/min). JSON: refresh_token; response access/rotated refresh token, expires_in, Bearer type. Refresh tokens are hashed, rotated and revoked on reuse/version mismatch. | REFRESH_TOKEN_INVALID/EXPIRED/REUSED, session binding mismatch, inactive user; backend mode admin check. | handler/auth_handler.go:671-711; service/auth_service.go:1689-1855 | PRIVATE_SOURCE_VERIFIED |
| Auth | logout/revoke sessions | POST /api/v1/auth/logout; POST /api/v1/auth/revoke-all-sessions | Logout is public and accepts optional refresh_token; revoke-all requires Bearer JWT. | Local client must clear tokens even if logout network call fails; revoke-all invalidates every refresh family. | server/routes/auth.go:57-58,257-260; handler/auth_handler.go:724-770 | PRIVATE_SOURCE_VERIFIED |
| Auth | current user/role | GET /api/v1/auth/me | Bearer JWT. Returns user DTO (id/email/username/role/balance/status/concurrency/groups/notifications/subscriptions) plus run_mode; role is server truth. | JWT validation, token version, IP/UA session binding, inactive/deleted user. | server/routes/auth.go:250-260; handler/auth_handler.go:424-458; handler/dto/types.go:12-45 | PRIVATE_SOURCE_VERIFIED |
| Auth | forgot/reset password | POST /api/v1/auth/forgot-password; POST /api/v1/auth/reset-password | Public. Forgot JSON: email + captcha proof; reset JSON: email, one-time token, new_password. | Forgot flow hides account existence; reset consumes one-time token, increments token version and revokes sessions. | server/routes/auth.go:67-74; handler/auth_handler.go:590-669 | PRIVATE_SOURCE_VERIFIED |
| Auth | OAuth/passkey extras | /api/v1/auth/oauth/*; /api/v1/auth/passkey/* | Present in private backend but excluded from required mobile first-screen flow. | Each start/finish route has provider/rate-limit rules. | server/routes/auth.go:44-239 | PRIVATE_SOURCE_VERIFIED |
| Cloudflare | server Turnstile verification | Auth/register/send-code/forgot requests carry turnstile_token plus first-party turnstile_nonce when using the native bridge; server calls https://challenges.cloudflare.com/turnstile/v0/siteverify | Secret is read from server settings and never serialized by public DTO. Exactly one captcha provider (Turnstile/Tencent/Aliyun) may be enabled. | Empty/invalid token, missing secret, provider conflict, action/hostname mismatch, missing/expired/replayed nonce fail closed. | service/auth_service.go; service/turnstile_service.go; repository/turnstile_nonce_store.go | PRIVATE_SOURCE_VERIFIED |
| Cloudflare | first-party Turnstile WebView gate | GET /mobile/captcha/turnstile | Backend serves a minimal first-party page with public site key, Redis-backed five-minute nonce, login/register/forgot_password action allowlist, strict CSP and origin-bearing one-shot message; native WebView validates origin/nonce/action/type. | Real hostname and Cloudflare widget behavior still require staging/device evidence. | handler/setting_handler.go; server/router.go; mobile src/components/turnstile-gate.tsx | PRIVATE_SOURCE_VERIFIED_WITH_GAP |
| Cloudflare | Cloudflare API challenge transport | Native client detects `cf-mitigated: challenge` and HTML challenge bodies before JSON parsing. | Never parse challenge HTML as an API envelope; expose retry/first-party challenge UI. | internal/util/httputil/httputil.go; mobile src/lib/admin-fetch.ts | PRIVATE_SOURCE_VERIFIED_WITH_GAP |

## User workspace

| Area | Method/path | Auth/permission | Contract/evidence | Status |
|---|---|---|---|---|
| Profile/password | GET /api/v1/user/profile; PUT /api/v1/user; PUT /api/v1/user/password | Bearer user JWT | Profile DTO includes identity bindings, notification emails and quota fields; password change requires old/new password. | PRIVATE_SOURCE_VERIFIED |
| TOTP/passkeys | /api/v1/user/totp/*; /api/v1/user/passkeys/* | Bearer user JWT; step-up for sensitive actions | Status/setup/enable/disable/step-up and WebAuthn begin/finish/delete/rename routes. | PRIVATE_SOURCE_VERIFIED |
| API keys | GET/POST/PUT/DELETE /api/v1/keys[/:id] | Bearer owner JWT | Key DTO includes group, allow/deny IPs, quota, expiry and rate windows; create/update uses server idempotency helper. | PRIVATE_SOURCE_VERIFIED |
| Groups/channels | GET /api/v1/groups/available, /groups/rates, /channels/available | Bearer user JWT | Feature/availability gates are server-side. | PRIVATE_SOURCE_VERIFIED |
| Usage/dashboard | GET /api/v1/usage, /usage/errors*, /usage/:id, /usage/stats, /usage/dashboard/*; POST /usage/dashboard/api-keys-usage | Bearer user JWT; heavy query limiter | Pagination and redaction are server handlers; snapshot-v2 is present. | PRIVATE_SOURCE_VERIFIED |
| Announcements | GET /api/v1/announcements; POST /announcements/:id/read | Bearer user JWT | User-visible list/read state. | PRIVATE_SOURCE_VERIFIED |
| Redeem/subscriptions | /api/v1/redeem*; /api/v1/subscriptions* | Bearer user JWT | Redeem and subscription read flows. | PRIVATE_SOURCE_VERIFIED |
| Channel monitors | /api/v1/channel-monitors*; /api/v1/channel-monitor-v2/* | Bearer user JWT + feature/mode guards | Read-only monitor views with heavy limiter for v2. | PRIVATE_SOURCE_VERIFIED |
| Payment read/config | GET /api/v1/payment/config, /checkout-info, /plans, /limits | Bearer user JWT | Checkout DTO exposes methods, limits, plans, payment UI configuration and public Stripe key. | PRIVATE_SOURCE_VERIFIED |
| Payment orders | POST /api/v1/payment/orders, /orders/verify; GET/POST order lookup/cancel/refund | Bearer user JWT | Create DTO includes amount/payment_type/openid/return_url/payment_source/order_type/plan_id/is_mobile; order state and ownership enforced. CreateOrder uses durable request-fingerprint idempotency and emits `X-Idempotency-Replayed` on replay. | Go/provider sandbox and staging retry evidence remain pending. | PRIVATE_SOURCE_VERIFIED_WITH_GAP |
| Public payment recovery | POST /api/v1/payment/public/orders/verify, /orders/resolve | No auth; persisted out_trade_no or signed resume token | Response is intentionally minimized/signed. | PRIVATE_SOURCE_VERIFIED |

## Admin workspace

All /api/v1/admin/* routes use AdminAuthMiddleware, global panel limiting, audit middleware and compliance guard. JWT Bearer validates token version/session binding and user.IsAdmin(); a legacy x-api-key path still exists for compatibility. The mobile app must use Bearer JWT only and must never ship or request an admin API key.

| Area | Method/path family | Extra control | Private evidence | Status |
|---|---|---|---|---|
| Dashboard/ops | /api/v1/admin/dashboard/*, /admin/ops/* | Admin JWT; audit on reads/writes; heavy realtime/error views | server/routes/admin.go:191-299 | PRIVATE_SOURCE_VERIFIED |
| Users | /api/v1/admin/users*, nested keys/usage/balance/groups/platform quotas/attributes | Admin JWT; writes audited and selected writes idempotent | server/routes/admin.go:300-326; handler/admin/user_handler.go | PRIVATE_SOURCE_VERIFIED |
| Groups/channels | /api/v1/admin/groups*, /admin/channels* | Admin JWT; writes audited; duplicate/bulk operations use idempotency where implemented | server/routes/admin.go:327-356,776-789 | PRIVATE_SOURCE_VERIFIED |
| Accounts/proxies | /api/v1/admin/accounts*, /admin/proxies* | Sensitive export/import and selected writes require step-up; audited | server/routes/admin.go:357-438,515-535 | PRIVATE_SOURCE_VERIFIED |
| Announcements | /api/v1/admin/announcements* | Admin JWT + audit/compliance | server/routes/admin.go:439-447 | PRIVATE_SOURCE_VERIFIED |
| Payment admin | /api/v1/admin/payment/dashboard, /config*, /orders*, /plans*, /providers* | Admin JWT + audit/compliance; provider/order writes are server-side | server/routes/payment.go:71-109 | PRIVATE_SOURCE_VERIFIED |
| Settings | GET/PUT /api/v1/admin/settings; email templates, rate limits, web-search, admin-key compatibility endpoints | Admin JWT + audit/compliance; selected sensitive settings step-up | server/routes/admin.go:564-607; handler/admin/setting_handler_update.go:24-80 | PRIVATE_SOURCE_VERIFIED |
| Turnstile admin config | Fields turnstile_enabled, turnstile_site_key, write-only turnstile_secret_key; GET exposes only turnstile_secret_key_configured | Admin-only; secret remains server-side. | handler/admin/setting_handler.go:92-180; handler/dto/settings.go:32-75 | PRIVATE_SOURCE_VERIFIED |
| Audit/compliance/risk | /api/v1/admin/audit-logs*, /compliance*, /risk-control*, /prompt-audit* | Immutable/redacted audit controls and compliance acceptance | server/routes/admin.go:136-190 | PRIVATE_SOURCE_VERIFIED |
| Admin API key compatibility | /api/v1/admin/settings/admin-api-key* and x-api-key middleware | Legacy compatibility remains in backend; prohibited in Vexlune Hub product UX. | server/routes/admin.go:577-579; server/middleware/admin_auth.go:24-79 | PRIVATE_SOURCE_VERIFIED_WITH_GAP |

## Cross-cutting acceptance

| Concern | Evidence/status |
|---|---|
| Response envelope | Private backend uses {code,message,reason?,metadata?,data?}; paginated data is data:{items,total,page,page_size,pages} (internal/pkg/response/response.go). | PRIVATE_SOURCE_VERIFIED |
| Auth cache isolation | Query keys are user workspace scoped and logout/401 clears the QueryClient; staging must verify account-switch isolation. | PRIVATE_SOURCE_VERIFIED_WITH_GAP |
| No mock/dead controls | User API key, usage, announcement, subscription and payment controls map to source-verified rows and expose server errors; source scan has no product mock fallback. | PRIVATE_SOURCE_VERIFIED_WITH_GAP |
| Android/iOS staging builds | Signing credentials, staging origin and test accounts are not present. | PRIVATE_BLOCKED |
