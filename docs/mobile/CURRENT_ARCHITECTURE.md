# Current Architecture — administrator-only console

Updated: 2026-10-05 (Asia/Shanghai).

Release contract: official Sub2API `v0.2.13`
(`3040209f205472038c1ba745a1bedd2edd9053b1`). The private backend checkout is
reference material only. No production backend or Cloudflare change is part of
this architecture update.

## Mobile runtime

- Expo SDK `~54.0.36`, React Native `0.81.5`, Expo Router `~6.0.24`, TanStack
  Query v5, Valtio, SecureStore, React Hook Form, Zod and Lucide remain runtime
  dependencies of the checked-in native Xcode workspace. This does not mean
  Expo/EAS cloud building is used; iOS release builds run through CocoaPods and
  `xcodebuild`.
- Bundle ID/package: `com.vexlune.mobile`; scheme: `vexlunemobile`; version
  `1.0.1`; iOS build `2`. Android is outside the current release scope.
- The app is an admin console with a single Admin Key screen, monitor,
  upstream-account, user-management, request-log, group and settings surfaces.
  Ordinary-user routes and public auth forms are not product entry points.

## Authentication and request path

1. `app/login.tsx` accepts one Admin Key.
2. `src/services/admin-auth.ts` performs a one-shot
   `GET /api/v1/admin/settings/admin-api-key` with `x-api-key` and only persists
   a key after the official `{code: 0, data: {exists: true, masked_key}}`
   response.
3. `src/auth/session.ts` stores the trimmed key in SecureStore with
   `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; it clears JWT fields when saving a key.
4. `src/lib/admin-fetch.ts` sends `x-api-key` on every authenticated request,
   removes an inherited Bearer header, parses the official envelope, preserves
   stable reason codes and request IDs, and handles 401/403/423/429/Cloudflare
   challenge responses.
5. The root unauthorized handler clears the key, query cache and navigation
   state. No Admin Key refresh or server logout endpoint exists.

The backend supports JWT for its admin middleware, but this product does not
expose email/password, registration, TOTP, refresh, or JWT login. Compatibility
exports in the source are retained only to avoid breaking older admin screens;
they are not a user-facing authentication contract.

## Permission and data boundaries

- All workspace data is requested from official `/api/v1/admin/*` routes. The
  server remains authoritative for role, audit, compliance, rate limits and
  step-up policy.
- The app never calls a private mobile bridge or `/mobile/captcha/*` backend
  route. The historical dedicated Turnstile WebView is a separate diagnostic
  feature and cannot grant admin access.
- Admin Key, cookies, tokens and provider secrets are excluded from logs,
  analytics, screenshots and query cache. Server errors are shown after safe
  redaction.

## Build and release boundary

The iOS Xcode workspace, local simulator build and signed archive/IPA are the
release artifacts. Cloudflare rules, production server files, migrations,
secrets and process restarts remain external operations requiring explicit
approval. TestFlight upload and real-device API evidence are still pending;
Android remains deferred.
