# Current Architecture Audit

## Mobile snapshot

- Expo SDK `~54.0.36`, React Native `0.81.5`, Expo Router `~6.0.24`, TanStack Query v5, Valtio, SecureStore, React Hook Form, Zod and Lucide.
- Bundle ID/package `com.vexlune.mobile`; scheme `vexlunemobile`; version `1.0.1`; iOS build `2`.
- Existing routes are an admin-only console: `app/login.tsx`, `(tabs)/monitor`, `accounts`, `users`, `logs`, `groups`, `more`, `settings`, plus detail pages.
- Existing auth stores an `admin-*` API key in SecureStore and sends `x-api-key`. This violates the required email/password + JWT/refresh contract and must be removed from product paths.
- Existing theme uses a purple palette and page-local `V` text mark. It must move to one SVG Vexlune brand component and blue design tokens.
- Existing API wrapper has timeout/retry/error handling and API envelope parsing, but it has no Bearer token, refresh single-flight, Cloudflare HTML detection, or role validation.
- Existing tests cover API-key storage/fetch, theme and config. They do not prove email auth, role routing, Turnstile, or user flows.
- Existing EAS and unsigned iOS workflow are present but cannot be considered verified without a build service or macOS runner.

## Public upstream comparison

The public upstream snapshot uses Gin routes under `/api/v1`, response envelope `{code,message,reason?,metadata?,data?}`, JWT auth, refresh tokens, TOTP, settings/public, user routes, payment routes, admin routes and SQL migrations. Exact private behavior remains unverified.

## Security decisions

- Access and refresh tokens: SecureStore only, never query cache, AsyncStorage, URL or logs.
- Server `/auth/me` is the source of role truth on boot and after refresh.
- Admin APIs require server-side admin middleware; client routing is UX only.
- API client treats `cf-mitigated: challenge` and unexpected `text/html` as a dedicated error.
- Turnstile proof is one-shot and scoped to login/register/reset; no Cloudflare secret or bypass credential ships in the app.
