# Cloudflare rules for Vexlune Hub mobile API

Updated: 2026-10-03 (Asia/Shanghai).

This document is the deployable rule specification for the private Hinln/sub2api origin. It contains no Cloudflare API token, zone ID, Turnstile secret or shared bypass credential. The actual zone export and staging verification are still required before release.

## Origin and trust boundary

- Public first-party host: hub.vexlune.com.
- Keep the origin private; allow ingress only from Cloudflare egress or the private load balancer.
- Keep TLS, WAF managed rules, bot signals, DDoS controls, Sub2API JWT/admin authorization and application rate limits enabled.
- Do not trust an app User-Agent, a custom app header or a shared secret as an API bypass.
- Forward the real client IP only from trusted reverse proxies; configure Sub2API server.trusted_proxies accordingly.

## API challenge policy

The native client must receive JSON from /api/v1/* and must not depend on a browser interstitial or cf_clearance.

Create a narrowly scoped Cloudflare custom rule or Skip action for browser-interactive Managed Challenge products:

    http.host eq "hub.vexlune.com"
    and starts_with(http.request.uri.path, "/api/v1/")

The Skip action may cover only the browser-interactive challenge products that would replace JSON with HTML. It must not skip:

- WAF managed rules or custom WAF rules;
- DDoS protection;
- TLS/origin controls;
- rate limiting or bot signals used for abuse detection;
- application authentication, authorization or audit logging.

If the zone cannot isolate the challenge product this way, change the Bot Fight/Managed Challenge configuration instead of bypassing it in the app. Never ship cf_clearance, a Cloudflare secret or a hard-coded bypass header in Vexlune Hub.

Keep normal browser protection for HTML pages. The first-party Turnstile page is a controlled exception:

    http.host eq "hub.vexlune.com"
    and http.request.uri.path eq "/mobile/captcha/turnstile"

That path must still pass WAF/TLS/rate limits and must be served by the backend with a strict CSP and an allowlisted Turnstile origin.

## Auth and public API limits

Apply Cloudflare rate limits and the backend Redis fail-close limits together. At minimum cover:

- POST /api/v1/auth/login
- POST /api/v1/auth/register
- POST /api/v1/auth/send-verify-code
- POST /api/v1/auth/forgot-password
- POST /api/v1/auth/refresh
- GET /api/v1/settings/public

Use IP and behavior signals as inputs, never as the sole trust decision. Keep the server-side Turnstile verification enabled when the public setting requires it.

## Native challenge diagnostics

The mobile transport must:

1. Treat cf-mitigated: challenge as a dedicated Cloudflare challenge error.
2. Treat an expected JSON response with Content-Type: text/html as a challenge/configuration error.
3. Detect Cloudflare challenge markers without exposing raw HTML.
4. Record only request path, timestamp and cf-ray for diagnostics.
5. Avoid infinite retries and direct the user to the first-party WebView gate when a Turnstile proof is required.

The backend already has challenge heuristics in backend/internal/util/httputil/httputil.go; the mobile client still needs an equivalent test-covered classifier.

## Turnstile WebView requirements

GET /mobile/captcha/turnstile must be hosted on this first-party origin and must:

- render only the configured public site key;
- load Cloudflare resources over HTTPS;
- generate and bind a nonce to the WebView session;
- send a structured postMessage containing type, nonce, origin and one token;
- reject replayed, expired, malformed or foreign-origin messages;
- verify the token server-side against the configured hostname/action before accepting it;
- never return or embed the Turnstile secret.

## Verification evidence required before release

Attach a sanitized Cloudflare rules export and staging test results covering:

- API requests return JSON without a Managed Challenge interstitial;
- browser HTML pages still retain the intended challenge/WAF posture;
- login/register/refresh/public settings are rate limited;
- a Turnstile success token is accepted once and rejected on replay/expiry;
- wrong origin, nonce and message type cannot trigger a token handoff;
- Android and iOS can reach the API over HTTPS and receive the same response envelope.

Current status: source rule specification complete; zone-specific deployment and staging evidence are blocked by missing Cloudflare access/configuration.

