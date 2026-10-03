# API Gap Report

Updated: 2026-10-03 (Asia/Shanghai).

## Authority and release boundary

The mobile release contract is the official Sub2API `v0.2.13` tag from
[`Wei-Shaw/sub2api`](https://github.com/Wei-Shaw/sub2api/tree/v0.2.13), commit
`3040209f205472038c1ba745a1bedd2edd9053b1`. The private `Hinln/sub2api`
checkout and any local hardening branch are audit material only; none of those
changes are part of this release contract.

Production is deliberately unchanged for this work. Do not deploy a backend
branch, run a production migration, change production settings, add a
Cloudflare rule, or route production traffic to a private mobile endpoint as a
mobile release step.

## Official v0.2.13 contract

The app talks to the normal `/api/v1` API. The source-verified public auth
surface is:

- `GET /api/v1/settings/public` returns public feature flags and captcha
  configuration (`turnstile_enabled`/`turnstile_site_key`, Tencent and Aliyun
  public IDs). It never returns a captcha secret.
- `POST /api/v1/auth/login`, `/register`, `/send-verify-code`, and
  `/forgot-password` accept the provider proof fields defined by v0.2.13:
  `turnstile_token`, or Tencent `tencent_captcha_ticket` plus
  `tencent_captcha_randstr` (Aliyun uses the documented `turnstile_token`
  field). The official contract has no `turnstile_nonce` field.
- `POST /api/v1/auth/login/2fa`, `/refresh`, `/logout` and
  `GET /api/v1/auth/me` retain the normal temporary-TOTP and Bearer
  access/refresh flows.

The official v0.2.13 tree has no `GET /mobile/captcha/turnstile` or
`/mobile/captcha/turnstile/health` route. It also has no private WebView
bridge, nonce ledger, bridge CSP contract, or action/hostname binding for a
mobile client. Captcha proof must come from the provider's official widget/SDK
or the official web auth surface and be submitted in the fields above. The
mobile client must not invent a nonce, rely on a private bridge, or send a
secret.

## Current gaps

| ID | Gap | Why it blocks | Required closure |
|---|---|---|---|
| OFFICIAL_CAPTCHA_001 | The current source captures the provider token from the official first-party login/register/password-reset page. The official contract has no private mobile endpoint or nonce field. | The capture must stay on the same first-party origin and submit only the provider proof fields accepted by v0.2.13. | Keep the official-page WebView capture bounded to the three auth pages; do not send a nonce at all and never add a private bridge route. |
| OFFICIAL_CONTRACT_002 | Private backend additions (nonce validation, payment idempotency coordinator, bridge health endpoint and related migrations) are not part of v0.2.13. | Source inspection of a private checkout cannot prove behavior on the unchanged production server. | Re-audit every enabled route and DTO against v0.2.13; mark unsupported controls unavailable rather than guessing. |
| STAGING_003 | No approved non-production origin and disposable QA accounts are recorded for this release. | Real role routing, captcha, refresh, payment and audited admin writes cannot be proven end to end. | Obtain a separately approved staging environment and revoke test accounts after QA. Never use production for destructive or payment tests. |
| IOS_004 | TestFlight/App Store Connect processing and physical-device acceptance are external gates. | A local native archive/IPA does not prove TestFlight installation or live API behavior. | Upload the Xcode-exported IPA through the approved Apple account and record processing/device evidence. |
| ANDROID_005 | Android is outside the current release scope. | No Android artifact or signing evidence is required for this release. | Keep Android workflows dormant; reopen the scope before configuring SDK, signing, APK/AAB builds or Android QA. |

## Confirmed mobile constraints

- Bearer access/refresh tokens are kept in SecureStore; the legacy admin API
  key is never requested, stored or sent.
- The transport must parse the official response envelope and classify
  Cloudflare HTML/challenge responses before attempting JSON decoding. This is
  a client error boundary, not a request to modify production Cloudflare
  rules.
- Payment and other mutating controls must use only idempotency behavior
  actually exposed by v0.2.13. If a write times out and no server-side replay
  contract exists, query the resulting resource before offering a retry.
- A row is `VERIFIED` only after a real non-production endpoint/device test.
  Local tests and a private checkout do not establish production evidence.

## Origin probe boundary

`scripts/verify-mobile-origin.sh` probes only the public settings endpoint and
the first-party `/login`, `/register`, and `/forgot-password` HTML pages. It
does not call `/mobile/captcha/*`, invent a nonce, or validate a private bridge.
The current `src/components/turnstile-gate.tsx` opens the same first-party auth
pages and captures the provider widget callback; its output is valid only when
the token is submitted using the official fields above. This report does not
authorize changing the backend or production to add a bridge route.
