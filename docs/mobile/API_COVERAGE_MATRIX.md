# API Coverage Matrix — administrator-only product

Updated: 2026-10-06 (Asia/Shanghai)

The mobile release targets the official Sub2API `v0.2.13` contract at tag
`3040209f205472038c1ba745a1bedd2edd9053b1`. The production server remains
unchanged. `Hinln/sub2api` and local hardening branches are audit material only.

Status meanings:

- **OFFICIAL_SOURCE_VERIFIED** — route and middleware are present in the
  official tag; this does not prove a deployed or device run.
- **MOBILE_IMPLEMENTED** — the current mobile source calls the route and has a
  local contract test; staging/device evidence may still be pending.
- **OUT_OF_SCOPE** — intentionally removed from the administrator-only product.
- **UNSUPPORTED** — absent from official `v0.2.13`; do not add a private route.
- **PENDING_DEVICE** — source and local tests exist, but real iOS evidence is
  still required.

## Admin Key authentication

| Screen/operation | Method/path | Request contract | Server result and app behavior | Evidence/status |
|---|---|---|---|---|
| Admin Key sign-in | `GET /api/v1/admin/settings/admin-api-key` | HTTPS; send only `x-api-key: <admin-...>`; no body and no Bearer header. | `200` with `{code: 0, data: {exists: true, masked_key}}` proves the key is accepted and permits SecureStore persistence. | official `backend/internal/server/middleware/admin_auth.go`, `handler/admin/setting_handler_runtime.go`; **MOBILE_IMPLEMENTED** |
| Invalid/revoked key | Same as above | Never log or retry the key. | `401`, typically reason `INVALID_ADMIN_KEY`; delete the local SecureStore key and remain on the sign-in screen. | official middleware + `tests/admin-auth.test.ts`; **MOBILE_IMPLEMENTED** |
| Missing/empty key | Any admin route | Request is not sent when the input is empty. | Client validation; server would return `401 UNAUTHORIZED`. | `app/login.tsx`, `src/services/admin-auth.ts`; **MOBILE_IMPLEMENTED** |
| Compliance gate | Any compliance-protected admin route | The key remains in `x-api-key`; no client bypass. | `423 ADMIN_COMPLIANCE_ACK_REQUIRED`; show the server instruction and require the official compliance acceptance flow. | official `admin_compliance.go`; **OFFICIAL_SOURCE_VERIFIED / PENDING_DEVICE** |
| Permission failure | Any admin route | Keep the same key and display the server error. | `403 FORBIDDEN` means the operation is not allowed; never show local success or silently retry. A valid Admin Key normally maps to the first configured admin, so a 403 can still come from route/step-up/compliance policy. | official admin middleware/guards; **OFFICIAL_SOURCE_VERIFIED** |
| Rate limit | Any admin route | Respect `Retry-After` when present. | `429`; bounded read retry only, no blind write retry. | `src/lib/admin-fetch.ts`; **MOBILE_IMPLEMENTED** |
| Local logout | Device only | No key in request body or URL. | Delete the SecureStore key, clear Query cache and return to `/login`; official v0.2.13 has no Admin-Key-specific logout route. | `src/auth/session.ts`, root unauthorized handler; **MOBILE_IMPLEMENTED** |

## Admin workspace routes

All rows below require the official `AdminAuthMiddleware`. The mobile client
uses the same `x-api-key` header for every request and never sends an Admin Key
as a user API key or model-provider credential.

| Area | Official method/path family | Server controls | Mobile surface/status |
|---|---|---|---|
| Dashboard and operations | `/api/v1/admin/dashboard/*`, `/api/v1/admin/ops/*` | Admin authentication, panel limits, audit logs; heavy/realtime routes may have additional limits. | Monitor tab; **OFFICIAL_SOURCE_VERIFIED / PENDING_DEVICE** |
| Users and balances | `/api/v1/admin/users*` and nested keys/usage/balance/groups/quota/attributes | Admin permission, input validation, audit; selected writes have official idempotency. | Users and user-detail screens; **OFFICIAL_SOURCE_VERIFIED / PENDING_DEVICE** |
| Upstream accounts/proxies | `/api/v1/admin/accounts*`, `/api/v1/admin/proxies*` | Admin auth, audit; sensitive export/import and selected writes may require step-up. | Accounts and account-detail screens; **OFFICIAL_SOURCE_VERIFIED / PENDING_DEVICE** |
| Groups/channels | `/api/v1/admin/groups*`, `/api/v1/admin/channels*` | Admin auth and audited writes; only documented idempotency may be used. | Groups/accounts controls; **OFFICIAL_SOURCE_VERIFIED / PENDING_DEVICE** |
| Announcements | `/api/v1/admin/announcements*` | Admin auth, audit and compliance as configured. | Admin announcements screen, if enabled in the current build; **OFFICIAL_SOURCE_VERIFIED** |
| Payment administration | `/api/v1/admin/payment/dashboard`, `/config*`, `/orders*`, `/plans*`, `/providers*` | Admin auth, audit, provider/order policy and possible step-up. | Admin payment/settings surfaces; **OFFICIAL_SOURCE_VERIFIED / PENDING_DEVICE** |
| Runtime settings | `GET/PUT /api/v1/admin/settings` and documented subroutes | Admin auth, audit and sensitive-setting step-up. | Settings screen; **OFFICIAL_SOURCE_VERIFIED / PENDING_DEVICE** |
| Admin Key lifecycle | `GET /api/v1/admin/settings/admin-api-key`, `POST .../regenerate`, `DELETE ...` | Admin auth and audit; full key is returned only once on regenerate. | The app validates/uses an existing key. Regeneration/deletion should be performed in the official admin surface until a dedicated mobile UX is explicitly approved; **OFFICIAL_SOURCE_VERIFIED** |
| Audit/compliance/risk | `/api/v1/admin/audit-logs*`, `/compliance*`, `/risk-control*`, `/prompt-audit*` | Immutable/redacted audit controls and compliance acceptance. | Read-only/status controls where present; **OFFICIAL_SOURCE_VERIFIED / PENDING_DEVICE** |
| Request logs | `GET /api/v1/admin/usage?...` | Admin auth; bounded server-side search and redaction. | Logs tab; **OFFICIAL_SOURCE_VERIFIED / PENDING_DEVICE** |

## Deliberately removed or unsupported

| Previous area | Decision | Reason |
|---|---|---|
| Email/password login, registration, forgot/reset password, email code, TOTP login | **OUT_OF_SCOPE** | The app is administrator-only and accepts Admin Key only. These public auth routes remain official backend capabilities but are not app entry points. |
| `/api/v1/auth/me`, refresh/logout JWT flow | **OUT_OF_SCOPE for product auth** | Official middleware supports JWT, but the mobile UX does not create or persist a JWT. Existing compatibility code must not be presented as a login option. |
| User workspace: profile, subscriptions, personal API keys, usage, user announcements, end-user payment | **OUT_OF_SCOPE** | No ordinary-user surface is shipped. Admin user/account management remains under `/api/v1/admin/*`. |
| `/mobile/captcha/*`, `/mobile/turnstile` backend bridge, nonce/health APIs | **UNSUPPORTED** | No such backend contract exists in official `v0.2.13`. Do not deploy or probe a private bridge. |
| Android release | **OUT_OF_SCOPE for this release** | Android build/signing/device evidence is deferred. |

## Cross-cutting transport rules

- Responses use the official `{code,message,reason?,metadata?,data?}` envelope.
- `x-request-id`/`request-id` may be retained for support; key, cookies,
  bearer tokens, passwords and response bodies are not logged.
- `cf-mitigated: challenge` or unexpected HTML is a Cloudflare challenge/error,
  never a successful API result. Admin Key requests do not bypass Cloudflare.
- Production deployment, Cloudflare rules/secrets, database migration and
  service restart are outside this local change and have not been performed.
