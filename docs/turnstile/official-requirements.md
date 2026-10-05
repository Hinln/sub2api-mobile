# Turnstile requirements and project mapping

Last reviewed: 2026-10-05. The production Sub2API deployment remains the official `0.2.13` release; this document describes the mobile client contract and does not authorize a backend fork or production change.

## Official requirements used by this implementation

| Requirement | Effective configuration | Project evidence |
| --- | --- | --- |
| Load the official client SDK from the Cloudflare origin | `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` | The dedicated page source is `frontend/src/views/public/MobileTurnstileView.vue` in the separately managed web repository; the native app only loads `/mobile/turnstile`. |
| Render a widget with an explicit site key and action | `turnstile.render(container, { sitekey, action, ...callbacks })` | The page obtains `turnstile_site_key` from `/api/v1/settings/public`; native code never embeds a secret. |
| Treat provider callbacks as lifecycle events | `callback`, `error-callback`, `expired-callback`, `before-interactive-callback`, `after-interactive-callback` | `src/lib/turnstile.ts` validates the bridge tuple; `src/components/turnstile-gate.tsx` records each accepted event. |
| Verify tokens server-side | Submit the token in the existing auth request; the server performs Cloudflare Siteverify | `src/services/auth.ts` sends `turnstile_token` and records only status, HTTP code, and a request ID. No client-side success is trusted as authentication. |
| Do not reuse an expired or consumed token | Refresh the page instance after the local refresh window and clear the token after submit/expiry | `TURNSTILE_LOCAL_REFRESH_MS`, `resetKey`, and `instanceKey` in `src/lib/turnstile.ts` and `TurnstileGate`. |
| Keep the challenge page same-origin and isolated | `https://<hub-origin>/mobile/turnstile#version=...&requestId=...&nonce=...&action=...` | `buildTurnstilePageUrl`; `onMessage` checks origin, path, action, request ID, nonce, and bridge version. |

The official material actually reviewed on 2026-10-04 says:

- Mobile integrations use a WebView with JavaScript, DOM storage, standard Web APIs, access to `challenges.cloudflare.com`, and stable user-agent/device behavior. The RN example does not require every available WebView prop.
- In `react-native-webview@13.15.0`, `onMessage` injects `window.ReactNativeWebView.postMessage` only when the handler is present; `WebViewMessageEvent.nativeEvent.data` and `url` are available. `isTopFrame` is iOS-only in `onShouldStartLoadWithRequest`, so Android subframe requests may omit it; the gate allows an unknown value only for the explicit Cloudflare subresource origin and always rejects a known top-frame replacement.
- Explicit rendering uses `api.js?render=explicit`; only the success callback's token means success. `before-interactive` and `after-interactive` are interaction lifecycle events, not proof of a valid token.
- Flexible widgets require a container with at least 300 CSS px; normal is 300x65 and compact is 150x140. The native surface therefore reserves a 220 point visible area after submit and does not infer success from appearance or hide the interaction region.
- Error `110200` means the hostname is not authorized and `200500` means an iframe load failure. A 401 PAT probe or an occasional random `*.challenges.cloudflare.com` DNS failure can be non-fatal when the widget eventually returns a token.
- Error-code handling follows the provider table: `110100`, `110110`, `110200`, `200100`, `400020`, `400021`, and `400070` are configuration/non-retry failures; `110600`, `110620`, `200500`, `300*`, and `600*` are retryable challenge failures. The app reports the received code and does not retry indefinitely.
- Tokens are valid for 300 seconds and are single-use. Siteverify is a server POST to `https://challenges.cloudflare.com/turnstile/v0/siteverify`; replay returns `timeout-or-duplicate`.
- If the WebView top-level document is redirected to `/login`, `/register`, `/forgot-password`, or another same-origin SPA path, the native gate must fail closed with a deployment/routing error. It must not display or submit the full auth page as a verification surface.
- Testing keys (`1x...AA` always pass, `2x...AB` always fail, `3x...FF` force interaction) isolate the bridge/state machine only; a test-key pass does not prove production authentication.

References used during review:

- <https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/>
- <https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>
- <https://developers.cloudflare.com/turnstile/troubleshooting/testing/>
- <https://developers.cloudflare.com/turnstile/get-started/mobile-implementation/>
- Installed WebView API: `node_modules/react-native-webview/lib/WebViewTypes.d.ts` (version `13.15.0` from `package.json`/`pnpm-lock.yaml`).

## Evidence fields

Development diagnostics always include the app version, native build ID (`1.0.1+2` for the current iOS build), component ID (`cloudflare-turnstile-explicit`), page path, bridge version (`1`), phase, action, request ID, status, timing, and a sanitized error code. They never include a token, password, cookie, authorization header, complete email, or secret.
