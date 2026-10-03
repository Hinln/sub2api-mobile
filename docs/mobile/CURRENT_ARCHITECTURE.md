# Current Architecture Audit

Release contract: official Sub2API `v0.2.13`
(`3040209f205472038c1ba745a1bedd2edd9053b1`). The private backend checkout is
audit material only; this release does not change production.

## Mobile snapshot

- Expo SDK `~54.0.36`, React Native `0.81.5`, Expo Router `~6.0.24`, TanStack Query v5, Valtio, SecureStore, React Hook Form, Zod and Lucide.
- Bundle ID/package `com.vexlune.mobile`; scheme `vexlunemobile`; version `1.0.1`; iOS build `2`.
- Existing routes are an admin-only console: `app/login.tsx`, `(tabs)/monitor`, `accounts`, `users`, `logs`, `groups`, `more`, `settings`, plus detail pages.
- Authentication stores only email/password-issued Bearer access/refresh tokens in SecureStore. The legacy API-key compatibility field remains empty for source compatibility and is never read or sent.
- Existing theme uses a purple palette and page-local `V` text mark. It must move to one SVG Vexlune brand component and blue design tokens.
- Existing API wrapper has timeout/retry/error handling and API envelope parsing, but it has no Bearer token, refresh single-flight, Cloudflare HTML detection, or role validation.
- Tests cover Bearer storage/fetch, refresh and Cloudflare boundary behavior, theme/config, and the user service contracts; staging still must prove real role routing and Turnstile.
- The iOS Xcode workspace and Podfile are versioned under `ios/` and compile directly with CocoaPods and `xcodebuild`; the release path does not run Expo prebuild, Expo run, or EAS Build. Expo Router and Expo native modules remain runtime dependencies for the current feature set. Android is out of the current release scope and its Gradle workflow is not a release gate.

## Public upstream comparison

The public upstream snapshot uses Gin routes under `/api/v1`, response envelope `{code,message,reason?,metadata?,data?}`, JWT auth, refresh tokens, TOTP, settings/public, user routes, payment routes, admin routes and SQL migrations. Exact private behavior remains unverified.

## Security decisions

- Access and refresh tokens: SecureStore only, never query cache, AsyncStorage, URL or logs.
- Server `/auth/me` is the source of role truth on boot and after refresh.
- Admin APIs require server-side admin middleware; client routing is UX only.
- API client treats `cf-mitigated: challenge` and unexpected `text/html` as a dedicated error.
- Captcha proof follows the official v0.2.13 public settings and provider fields. The native gate opens the official first-party auth page and captures its provider callback; no Cloudflare secret, nonce, private mobile bridge or bypass credential ships in the app.
