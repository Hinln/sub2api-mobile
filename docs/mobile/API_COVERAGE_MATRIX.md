# API Coverage Matrix

Updated: 2026-10-04 (Asia/Shanghai).

The release contract is the official Sub2API `v0.2.13` tag
(`3040209f205472038c1ba745a1bedd2edd9053b1`). The mobile repository consumes
that public `/api/v1` contract. The private `Hinln/sub2api` checkout is audit
material only and production is unchanged for this release. Statuses distinguish
official source evidence from non-production/device evidence:

- OFFICIAL_SOURCE_VERIFIED: route, middleware and DTO are present in official v0.2.13; this is not a staging/device proof.
- OFFICIAL_SOURCE_VERIFIED_WITH_GAP: official source exists, but deployment evidence or an explicitly documented compatibility gap remains.
- OFFICIAL_UNSUPPORTED: the requested extension is absent from official v0.2.13.
- AUDIT_ONLY: observed in a private/local checkout and not accepted as official or production evidence.
- MOBILE_PENDING: the official contract exists, but the mobile implementation or contract test is unfinished.
- VERIFIED: real staging/device evidence exists (none yet in this audit).
- SNAPSHOT_ONLY: reference snapshot only.

## Auth, settings and Cloudflare

| Area | Screen/control | Method/path | Request/response contract and permission | Error/edge behavior | Source evidence | Status |
|---|---|---|---|---|---|---|
| Auth | public settings | GET /api/v1/settings/public | Public. Returns registration/email verification/password reset/TOTP/passkey flags, login agreement, turnstile_enabled, turnstile_site_key, public captcha IDs, branding, payment and feature flags. Never returns Turnstile secret. | Public IP limiter; DB/settings failure is an error. | server/routes/auth.go; handler/setting_handler.go; handler/dto/settings.go:362 | AUDIT_ONLY |
| Auth | email/password login | POST /api/v1/auth/login | Public, rate limited by the server. JSON: email, password, optional provider proof (`turnstile_token` or Tencent/Aliyun fields). Success: access_token, refresh_token, expires_in, token_type=Bearer, user; TOTP users receive requires_2fa and a temporary login token. | Captcha provider selection is server-owned; 401/403/429; backend mode may allow admins only. | official v0.2.13 auth handler/routes | OFFICIAL_SOURCE_VERIFIED |
| Auth | TOTP login | POST /api/v1/auth/login/2fa | Public temp-session flow. JSON: temp_token, six-digit totp_code; returns the same token pair/user DTO after verification. | Expired temp token, invalid code, inactive user, revoked token; rate limit 20/min. | handler/auth_handler.go:294-423; server/routes/auth.go:41-43 | AUDIT_ONLY |
| Auth | registration | POST /api/v1/auth/register | Public. JSON: email, password, optional verify_code, provider proof fields and promo/invitation/affiliate codes. Returns token pair/user. | Registration switch, suffix/domain quota, duplicate email, required email verification/captcha. | official v0.2.13 auth handler/service | OFFICIAL_SOURCE_VERIFIED |
| Auth | send email code | POST /api/v1/auth/send-verify-code | Public, rate limit 5/min. JSON: email and captcha proof; response message, countdown. | Captcha required according to active provider; cooldown/429; email service errors. | handler/auth_handler.go:61-75,212-237; server/routes/auth.go:50-52 | AUDIT_ONLY |
| Auth | refresh | POST /api/v1/auth/refresh | Public rate-limited (30/min). JSON: refresh_token; response access/rotated refresh token, expires_in, Bearer type. Refresh tokens are hashed, rotated and revoked on reuse/version mismatch. | REFRESH_TOKEN_INVALID/EXPIRED/REUSED, session binding mismatch, inactive user; backend mode admin check. | handler/auth_handler.go:671-711; service/auth_service.go:1689-1855 | AUDIT_ONLY |
| Auth | logout/revoke sessions | POST /api/v1/auth/logout; POST /api/v1/auth/revoke-all-sessions | Logout is public and accepts optional refresh_token; revoke-all requires Bearer JWT. | Local client must clear tokens even if logout network call fails; revoke-all invalidates every refresh family. | server/routes/auth.go:57-58,257-260; handler/auth_handler.go:724-770 | AUDIT_ONLY |
| Auth | current user/role | GET /api/v1/auth/me | Bearer JWT. Returns user DTO (id/email/username/role/balance/status/concurrency/groups/notifications/subscriptions) plus run_mode; role is server truth. | JWT validation, token version, IP/UA session binding, inactive/deleted user. | server/routes/auth.go:250-260; handler/auth_handler.go:424-458; handler/dto/types.go:12-45 | AUDIT_ONLY |
| Auth | forgot/reset password | POST /api/v1/auth/forgot-password; POST /api/v1/auth/reset-password | Public. Forgot JSON: email + captcha proof; reset JSON: email, one-time token, new_password. | Forgot flow hides account existence; reset consumes one-time token, increments token version and revokes sessions. | server/routes/auth.go:67-74; handler/auth_handler.go:590-669 | AUDIT_ONLY |
| Auth | OAuth/passkey extras | /api/v1/auth/oauth/*; /api/v1/auth/passkey/* | Present in private backend but excluded from required mobile first-screen flow. | Each start/finish route has provider/rate-limit rules. | server/routes/auth.go:44-239 | AUDIT_ONLY |
| Cloudflare | provider verification | Auth/register/send-code/forgot requests carry the official provider proof fields; server verifies the selected provider server-side. | Secret is read from server settings and never serialized by public DTO. Exactly one captcha provider (Turnstile/Tencent/Aliyun) may be enabled. | Empty/invalid token and provider conflict fail closed; official v0.2.13 has no nonce or mobile bridge contract. | official `backend/internal/service/turnstile_service.go`, `tencent_captcha_service.go`, `aliyun_captcha_service.go` | OFFICIAL_SOURCE_VERIFIED |
| Cloudflare | mobile bridge | No `/mobile/captcha/turnstile` route exists in official v0.2.13. | Mobile must use the provider's official widget/SDK or web auth surface and submit the token fields from `/settings/public`. | A private nonce/bridge implementation is unsupported and must not be routed from production. | official v0.2.13 tree; see `API_GAP_REPORT.md` | OFFICIAL_UNSUPPORTED |
| Cloudflare | Turnstile bridge health probe | unsupported in official v0.2.13 | No `/mobile/captcha/turnstile/health` endpoint exists; use `/api/v1/settings/public` for public settings. | Do not route or probe a private bridge in production. | official v0.2.13 tree | OFFICIAL_UNSUPPORTED |
| Cloudflare | Cloudflare API challenge transport | Native client detects `cf-mitigated: challenge` and HTML challenge bodies before JSON parsing. | Never parse challenge HTML as an API envelope; expose retry/first-party challenge UI. | internal/util/httputil/httputil.go; mobile src/lib/admin-fetch.ts | AUDIT_ONLY |

## User workspace

| Area | Method/path | Auth/permission | Contract/evidence | Status |
|---|---|---|---|---|
| Profile/password | GET /api/v1/user/profile; PUT /api/v1/user; PUT /api/v1/user/password | Bearer user JWT | Profile DTO includes identity bindings, notification emails and quota fields; password change requires old/new password. | AUDIT_ONLY |
| TOTP/passkeys | /api/v1/user/totp/*; /api/v1/user/passkeys/* | Bearer user JWT; step-up for sensitive actions | Status/setup/enable/disable/step-up and WebAuthn begin/finish/delete/rename routes. | AUDIT_ONLY |
| API keys | GET/POST/PUT/DELETE /api/v1/keys[/:id] | Bearer owner JWT | Key DTO includes group, allow/deny IPs, quota, expiry and rate windows; official v0.2.13 has a server idempotency helper for key creation only. Update/delete do not expose a replay contract. | AUDIT_ONLY |
| Groups/channels | GET /api/v1/groups/available, /groups/rates, /channels/available | Bearer user JWT | Feature/availability gates are server-side. | AUDIT_ONLY |
| Usage/dashboard | GET /api/v1/usage, /usage/errors*, /usage/:id, /usage/stats, /usage/dashboard/*; POST /usage/dashboard/api-keys-usage | Bearer user JWT; heavy query limiter | Pagination and redaction are server handlers; snapshot-v2 is present. | AUDIT_ONLY |
| Announcements | GET /api/v1/announcements; POST /announcements/:id/read | Bearer user JWT | User-visible list/read state. | AUDIT_ONLY |
| Redeem/subscriptions | /api/v1/redeem*; /api/v1/subscriptions* | Bearer user JWT | Redeem and subscription read flows. | AUDIT_ONLY |
| Channel monitors | /api/v1/channel-monitors*; /api/v1/channel-monitor-v2/* | Bearer user JWT + feature/mode guards | Read-only monitor views with heavy limiter for v2. | AUDIT_ONLY |
| Payment read/config | GET /api/v1/payment/config, /checkout-info, /plans, /limits | Bearer user JWT | Checkout DTO exposes methods, limits, plans, payment UI configuration and public Stripe key. | AUDIT_ONLY |
| Payment orders | POST /api/v1/payment/orders, /orders/verify; GET/POST order lookup/cancel/refund | Bearer user JWT | Create DTO includes amount/payment_type/openid/return_url/payment_source/order_type/plan_id/is_mobile; order state and ownership enforced. Official v0.2.13 does not document `Idempotency-Key` replay for order creation or cancel/refund; after a timeout the client must query the order before offering a retry. | Go/provider sandbox and staging retry evidence remain pending. | AUDIT_ONLY |
| Public payment recovery | POST /api/v1/payment/public/orders/verify, /orders/resolve | No auth; persisted out_trade_no or signed resume token | Response is intentionally minimized/signed. | AUDIT_ONLY |

## Admin workspace

All /api/v1/admin/* routes use AdminAuthMiddleware, global panel limiting, audit middleware and compliance guard. JWT Bearer validates token version/session binding and user.IsAdmin(); a legacy x-api-key path still exists for compatibility. The mobile app must use Bearer JWT only and must never ship or request an admin API key.

| Area | Method/path family | Extra control | Source evidence | Status |
|---|---|---|---|---|
| Dashboard/ops | /api/v1/admin/dashboard/*, /admin/ops/* | Admin JWT; audit on reads/writes; heavy realtime/error views | server/routes/admin.go:191-299 | AUDIT_ONLY |
| Users | /api/v1/admin/users*, nested keys/usage/balance/groups/platform quotas/attributes | Admin JWT; writes audited and selected writes idempotent | server/routes/admin.go:300-326; handler/admin/user_handler.go | AUDIT_ONLY |
| Groups/channels | /api/v1/admin/groups*, /admin/channels* | Admin JWT; writes audited; duplicate/bulk operations use idempotency where implemented | server/routes/admin.go:327-356,776-789 | AUDIT_ONLY |
| Accounts/proxies | /api/v1/admin/accounts*, /admin/proxies* | Sensitive export/import and selected writes require step-up; audited | server/routes/admin.go:357-438,515-535 | AUDIT_ONLY |
| Announcements | /api/v1/admin/announcements* | Admin JWT + audit/compliance | server/routes/admin.go:439-447 | AUDIT_ONLY |
| Payment admin | /api/v1/admin/payment/dashboard, /config*, /orders*, /plans*, /providers* | Admin JWT + audit/compliance; provider/order writes are server-side | server/routes/payment.go:71-109 | AUDIT_ONLY |
| Settings | GET/PUT /api/v1/admin/settings; email templates, rate limits, web-search, admin-key compatibility endpoints | Admin JWT + audit/compliance; selected sensitive settings step-up | server/routes/admin.go:564-607; handler/admin/setting_handler_update.go:24-80 | AUDIT_ONLY |
| Turnstile admin config | Fields turnstile_enabled, turnstile_site_key, write-only turnstile_secret_key; GET exposes only turnstile_secret_key_configured | Admin-only; secret remains server-side. | handler/admin/setting_handler.go:92-180; handler/dto/settings.go:32-75 | AUDIT_ONLY |
| Audit/compliance/risk | /api/v1/admin/audit-logs*, /compliance*, /risk-control*, /prompt-audit* | Immutable/redacted audit controls and compliance acceptance | server/routes/admin.go:136-190 | AUDIT_ONLY |
| Request logs search | GET /api/v1/admin/usage?search=... | Admin JWT; bounded server-side lookup by exact request ID or model substring; no client-only status/error filter is exposed because usage-log DTO has no such fields. | backend/internal/handler/admin/usage_handler.go; backend/internal/repository/usage_log_repo_query.go | AUDIT_ONLY |
| Admin API key compatibility | /api/v1/admin/settings/admin-api-key* and x-api-key middleware | Legacy compatibility remains in backend; prohibited in Vexlune Hub product UX. | server/routes/admin.go:577-579; server/middleware/admin_auth.go:24-79 | AUDIT_ONLY |

## Cross-cutting acceptance

| Concern | Evidence/status |
|---|---|
| Response envelope | Official v0.2.13 uses `{code,message,reason?,metadata?,data?}`; paginated data is `data:{items,total,page,page_size,pages}` where applicable. | OFFICIAL_SOURCE_VERIFIED |
| Auth cache isolation | Query keys are user workspace scoped and logout/401 clears the QueryClient; staging must verify account-switch isolation. | AUDIT_ONLY |
| No mock/dead controls | User API key, usage, announcement, subscription and payment controls map to source-verified rows and expose server errors; source scan has no product mock fallback. | AUDIT_ONLY |
| iOS staging/release build | Native Xcode simulator/device builds and a locally signed App Store IPA are verified; non-production API, TestFlight upload and test accounts remain pending. Android APK/AAB is deferred for this release. | OFFICIAL_SOURCE_VERIFIED_WITH_GAP |

## Field-complete interaction index

The grouped route tables above preserve the backend audit detail. This index makes the
required page/control, mobile function, contract, permission, error and automated-test
fields explicit for every first-release interaction. Test references are source tests;
they do not imply a deployed staging account exists.

| Page / control | Role | Mobile function / module | Backend interface | Request / response contract | Permission | Error / edge behavior | Automated test | Status |
|---|---|---|---|---|---|---|---|---|
| 登录、注册、忘记密码 | public | `src/services/auth.ts`; `app/login.tsx`, `register.tsx`, `forgot-password.tsx` | `POST /api/v1/auth/login`, `/register`, `/forgot-password` | email/password; optional official provider proof fields; Bearer pair or reset acknowledgement | public endpoint; server settings decide feature flags | 401/403/429, disabled registration/reset, Cloudflare HTML and provider errors are shown | `tests/auth.test.ts`, `tests/admin-fetch.test.ts` | MOBILE_IMPLEMENTED / source tested |
| TOTP 二次登录 | public session | `submitTwoFactor` in `src/services/auth.ts` | `POST /api/v1/auth/login/2fa` | temporary token + six-digit code → token pair/user | temporary login session | malformed/expired temp token and invalid code fail closed | `tests/auth.test.ts` | MOBILE_IMPLEMENTED / source tested |
| 角色识别与工作台路由 | authenticated | `auth/me`, root layout and workspace mode | `GET /api/v1/auth/me` | user DTO + `role`/`run_mode` | valid Bearer JWT | stale role, 403 or inactive user clears session; admin may switch only to self user workspace | `tests/auth.test.ts` | MOBILE_IMPLEMENTED / source tested |
| 刷新、退出、退出全部设备 | authenticated | `refreshSession`, `signOut`, SecureStore adapter | `POST /api/v1/auth/refresh`, `/logout`, `/revoke-all-sessions` | refresh token rotation; logout acknowledgement | JWT for revoke-all; logout accepts optional refresh token | single-flight refresh; failed refresh clears credentials/query cache | `tests/admin-fetch.test.ts`, `tests/auth.test.ts`, `tests/secure-store.test.ts` | MOBILE_IMPLEMENTED / source tested |
| Captcha proof | public auth | provider widget/SDK integration | `GET /api/v1/settings/public`; auth endpoints carry provider proof | one provider token (`turnstile_token` or Tencent/Aliyun fields) | public settings select provider; server verifies secret | expired/invalid token is shown as a retryable auth error; no nonce or private bridge | provider-specific tests; official contract audit | MOBILE_IMPLEMENTED / source tested; staging pending |
| Private mobile bridge | public auth | unsupported release extension | no `/mobile/captcha/*` route in official v0.2.13 | no nonce/action/origin handoff | unsupported by official backend | do not ship or route private bridge in production | `API_GAP_REPORT.md` | UNSUPPORTED |
| 用户首页余额与用量卡 | user/admin-self | `app/user.tsx`; `src/services/user.ts` | `GET /auth/me`, `/user/profile`, `/usage/dashboard/snapshot-v2` | server balance and aggregate token/cost fields; missing ≠ zero | user JWT | loading/error/unknown values remain visible; no client-side billing math | `tests/formatters.test.ts`, `tests/auth.test.ts` | MOBILE_IMPLEMENTED / source tested |
| 用户 API Key 列表与写操作 | user | `app/user-keys.tsx`; `list/create/update/deleteApiKey` | `GET/POST/PUT/DELETE /api/v1/keys[/:id]` | key DTO, group/limits/expiry; create may return plaintext once | owner JWT; server ownership | creation may use the official create helper; update/delete timeouts require a fresh server query before retry; secret is never reconstructed or logged | `tests/user-security.test.ts`, `tests/admin-fetch.test.ts` | MOBILE_IMPLEMENTED / source tested |
| 用户 usage 与详情 | user | `app/user-usage.tsx`; usage query helpers | `GET /api/v1/usage*`, dashboard endpoints | paginated logs, stats, trend and redacted detail | owner JWT + query limiter | empty/error/pagination and Cloudflare challenge states | `tests/formatters.test.ts`, `tests/admin-fetch.test.ts` | MOBILE_IMPLEMENTED / source tested |
| 公告、模型、价格、服务状态 | user | `app/user-announcements.tsx`, user services | `GET /announcements`, `/groups/available`, `/groups/rates`, `/channels/available`, `/model-plaza`; `POST /announcements/:id/read` | dynamic lists/read state and server rates | user JWT | missing feature or empty list has explicit empty state; no screenshot data | `tests/admin-fetch.test.ts` | MOBILE_IMPLEMENTED / source tested |
| 充值配置与订单 | user | `app/user-billing.tsx`; payment service helpers | `GET /payment/config|checkout-info|plans|limits`; `POST /payment/orders`; `GET /orders/my`; verify/cancel/refund | checkout DTO, order state and provider URL; official v0.2.13 has no documented order replay header | user JWT; payment provider rules remain server-owned | provider payload must contain a validated URL; timeout first refreshes the order result and never assumes a replay | `tests/payment.test.ts`, `tests/admin-fetch.test.ts` | MOBILE_IMPLEMENTED / provider staging pending |
| 个人设置、改密、TOTP/生物识别 | user/admin-self | `app/user-settings.tsx`, settings tab; user service | `GET/PUT /user/profile`, `PUT /user/password`, `/user/totp/*` | profile/password/TOTP DTOs; biometric is local only | user JWT; TOTP step-up for sensitive action | server validation shown; device without biometric disables control | `tests/user-security.test.ts`, `tests/secure-store.test.ts`, `tests/theme.test.ts` | MOBILE_IMPLEMENTED / source tested |
| 管理员概览与告警 | admin | monitor tab; `src/services/admin.ts` | `/admin/dashboard/*`, `/admin/ops/alert-events*`, request/upstream errors | server aggregates and paginated events | AdminAuth JWT, panel limiter, audit | no-data does not become fake 100%; forbidden responses stay visible | `tests/admin-services.test.ts`, `tests/admin-fetch.test.ts` | MOBILE_IMPLEMENTED / staging pending |
| 管理员上游账号 | admin | `accounts` tab and account detail | `/admin/accounts*`, account test/refresh/error/quota actions | account summaries/models/stats; secrets redacted | AdminAuth; sensitive writes may require step-up | operation errors, unsupported provider capability and confirmation are explicit | `tests/admin-services.test.ts` | MOBILE_IMPLEMENTED / staging pending |
| 管理员用户、余额、分组 | admin | `users` tab, `users/[id]`, `create-user` | `/admin/users*`, balance, replace-group, quotas | paginated user DTO; balance operation + reason + idempotency key | AdminAuth + audit/compliance; step-up where configured | duplicate writes replay safely; 403/409/validation error shown | `tests/admin-services.test.ts`, `tests/admin-fetch.test.ts` | MOBILE_IMPLEMENTED / staging pending |
| 管理员请求日志与排障 | admin | `logs` tab; search helpers | `GET /admin/usage?search=...`, `/admin/ops/request-errors*`, `/upstream-errors*` | exact request ID/model search; redacted metadata and resolution state | AdminAuth; bounded query limiter | absent DTO fields are not fabricated; detail never exposes body/secret | `tests/admin-services.test.ts` | MOBILE_IMPLEMENTED / source tested |
| 分组、模型、公告管理 | admin | `admin-announcements.tsx` and admin service modules | `/admin/groups*`, `/admin/announcements*`, channel/model routes | CRUD DTOs and server status/visibility | AdminAuth + audit; writes idempotent where supported | confirmation, conflict and feature-gate errors remain actionable | `tests/admin-services.test.ts` | MOBILE_IMPLEMENTED / staging pending |
| 管理员订单与资金 | admin | `admin-orders.tsx`; extended admin service | `/admin/payment/dashboard`, `/orders*`, retry/cancel/refund | order state transitions and provider result from server | AdminAuth + compliance/step-up/audit | no optimistic success; duplicate retry/refund is idempotent or rejected | `tests/payment.test.ts`, `tests/admin-fetch.test.ts` | MOBILE_IMPLEMENTED / provider staging pending |
| 审计、安全设置、版本 | admin | `admin-security.tsx`, `about.tsx` | `/admin/audit-logs*`, `/admin/settings`, `/auth/me` | redacted audit rows; secret settings write-only; app version local metadata | AdminAuth + audit; local biometric does not grant server access | secret never rendered; unsupported setting remains hidden | `tests/admin-fetch.test.ts`, `tests/secure-store.test.ts` | MOBILE_IMPLEMENTED / staging pending |
| API/Cloudflare challenge transport | authenticated/public | `src/lib/admin-fetch.ts` | all `/api/v1/*` | response envelope `{code,message,reason?,metadata?,data?}` | endpoint-specific JWT/limiter | `cf-mitigated`/HTML gets dedicated challenge error; no infinite retries | `tests/admin-fetch.test.ts`, `tests/auth.test.ts` | MOBILE_IMPLEMENTED / source tested |
