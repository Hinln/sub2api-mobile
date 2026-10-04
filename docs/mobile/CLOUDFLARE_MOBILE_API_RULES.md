# Cloudflare notes for Vexlune Hub mobile API

Updated: 2026-10-04 (Asia/Shanghai).

This is a client boundary note for the official Sub2API `v0.2.13` contract. It
is not a production change request and contains no Cloudflare token, zone ID,
Turnstile secret or bypass credential. The current mobile release does not add
or modify Cloudflare rules.

## API boundary

The app calls the normal HTTPS `/api/v1/*` API and expects the official JSON
response envelope. The transport must:

1. Treat `cf-mitigated: challenge` as a dedicated challenge error.
2. Treat unexpected `text/html` on an API request as a challenge/configuration
   error before parsing JSON.
3. Record only request path, timestamp and `cf-ray` for diagnostics.
4. Avoid infinite retries and ask the user to retry through the approved auth
   surface.

This handling does not authorize an app header, `cf_clearance` cookie, shared
secret or User-Agent bypass. Do not weaken WAF, DDoS, TLS, bot, rate-limit or
application authorization controls.

## Captcha contract

Official v0.2.13 exposes captcha configuration through
`GET /api/v1/settings/public`. Depending on the selected provider, the web or
native UI obtains a provider token and submits `turnstile_token`, or the
documented Tencent/Aliyun fields, to the auth endpoint. The official release
does not define `/mobile/captcha/turnstile`, `/mobile/captcha/turnstile/health`,
a backend nonce ledger or a backend mobile bridge. The app's `/mobile/turnstile`
frontend page has a constrained native WebView `postMessage` transport, but
that page bridge does not change the API contract or accept credentials.

Do not add a Cloudflare exception for a private bridge path. If an approved
non-production environment returns HTML for an API request, report the origin
or edge configuration to its operator and keep the client error visible. Do
not change production to make a mobile test pass.

## Verification evidence

For a separately approved non-production environment, record:

- `/api/v1/settings/public` is JSON 200 and exposes only public provider values;
- a valid provider token is accepted once and expired/invalid tokens fail;
- HTML challenges remain classified before JSON decoding;
- iOS reaches the API over HTTPS and preserves the official response envelope.

Android is deferred for this release. No Android network or build evidence is a
release requirement.
