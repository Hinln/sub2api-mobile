# API Gap Report

Updated: 2026-10-04 (Asia/Shanghai).

## Authority and release boundary

The mobile release contract is the official Sub2API `v0.2.13` tag from
[`Wei-Shaw/sub2api`](https://github.com/Wei-Shaw/sub2api/tree/v0.2.13), commit
`3040209f205472038c1ba745a1bedd2edd9053b1`. The private `Hinln/sub2api`
checkout and any local hardening branch are audit material only; none of those
changes are part of this release contract.

Repository identity is separate from the API authority: `Hinln/sub2api` is an
independent repository, and GitHub currently reports `Hinln/sub2api-mobile` as a
fork of `ckken/sub2api-mobile`, not as a fork of the official `Wei-Shaw/sub2api`
project. Neither repository relationship grants permission to deploy the
private backend checkout. The mobile release continues to target only the
official v0.2.13 API surface described below.

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
| OFFICIAL_CAPTCHA_001 | The mobile source now hosts the provider widget on the same-origin frontend route `/mobile/turnstile`. The route is a dedicated static page, not a new `/api/v1` or private backend captcha endpoint; the native app receives one token through a strictly validated WebView `postMessage` tuple (`version`, `requestId`, `nonce`, `action`). | The route bundle and CSP must be deployed to the approved environment, and one real challenge token must be consumed by the unchanged official auth endpoint. The native page must never receive credentials or session tokens. | Publish the frontend route, verify `https://challenges.cloudflare.com` script/frame/connect CSP, and run a real iOS login/register/reset check. Keep the backend at v0.2.13 and submit only the official `turnstile_token` field. |
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

`scripts/verify-mobile-origin.sh` probes the public settings endpoint and the
first-party `/login`, `/register`, `/forgot-password`, and `/mobile/turnstile`
HTML pages. It does not call `/mobile/captcha/*` or validate a backend private
bridge. The current `src/components/turnstile-gate.tsx` opens only the dedicated
same-origin challenge page and validates its native message tuple before passing
the token to the official auth endpoint. The page bridge is a frontend transport
boundary; it does not add a backend API, nonce ledger, or Cloudflare exception.
