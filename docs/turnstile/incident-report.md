# Turnstile incident report

Date: 2026-10-04 to 2026-10-05  
Environment: iPhone 17 Pro Max simulator, iOS 26.5; native bundle `1.0.1`, build `2`; production origin `https://hub.vexlune.com`.

## First missing event

The first missing event is the dedicated-page handshake. The public configuration request succeeds, but the production URL used by the native WebView does not serve the dedicated page:

```text
GET https://hub.vexlune.com/api/v1/settings/public
200 application/json
turnstile_enabled=true
turnstile_site_key=0x4AAAAAAD-SBybJjIg5VuPI
aliyun_captcha_enabled=false
tencent_captcha_enabled=false

GET https://hub.vexlune.com/mobile/turnstile
200 text/html; charset=utf-8
title=Vexlune Hub - AI API Gateway
MobileTurnstile marker: false
Turnstile SDK marker: false
```

The route response is the ordinary homepage SPA shell (`/assets/index-xMHQ6xfX.js`), not the `MobileTurnstile` route. Consequently the WebView cannot emit `ready`, `before-interactive`, `after-interactive`, `success`, `expired`, or a bridge error for the expected tuple. No business auth request or server Siteverify request can be inferred from this run.

The same result is visible in a normal browser: navigating to `/mobile/turnstile` ends at `/login?redirect=/mobile/turnstile`, and the DOM is the login form with no `MobileTurnstile`, `ReactNativeWebView`, or Turnstile SDK marker. On the freshly built iPhone 17 Pro Max simulator, entering dummy credentials and tapping 登录 changes the native status to “正在加载安全验证…” while the form asks to complete Cloudflare verification; no dedicated challenge surface appears before the route timeout window. This is a route/bundle failure, not evidence that a real challenge was solved or rejected.

## Local same-origin fallback evidence

The native gate now has an app-owned HTML fallback for the login and registration flows. It uses `source={{html, baseUrl: "https://hub.vexlune.com/mobile/turnstile"}}`, injects only the public `turnstile_site_key` already read from `/api/v1/settings/public`, and loads the official SDK from `challenges.cloudflare.com`. The HTML fallback never contains credentials or the Turnstile secret. This lets the app exercise the real widget without waiting for the stale production SPA route. In the earlier pre-fix run, WebKit recorded the `loadDataWithNavigation` document and the public settings response (HTTP 200, 85,842 bytes) but no token; the later signed-build acceptance below records the complete token and login chain.

This explains the apparent contradiction in older screenshots: an old/full-page or provider iframe can show an in-progress Cloudflare surface while the native gate has not received the dedicated-page handshake. Those are separate states. The native code now records page load separately from widget ready and classifies a provider callback error separately from a page/SDK load error; it does not turn a missing token into a generic “not loaded” diagnosis.

## Lifecycle evidence contract

The expected event order is:

`config-read → page-load started/loaded → bridge ready (widget-rendered) → provider interaction → provider success/error/expired → bridge token → business-submit → backend-reject or accepted`.

`requestId` and `nonce` identify one page instance. A stale or foreign message is discarded before it can update the UI. The token itself is never written to logs.

## Code change made locally

- Added build/component/bridge identity to development diagnostic lines.
- Added page load start/end events.
- Preserved the distinction between a provider error after a rendered widget and an SDK/page load failure; provider error codes are shown and recorded instead of claiming that no component loaded.
- Kept the origin/path/action/request/nonce validation and the existing server request contract.

The previous auth-switch crash fix and the “提交时加载安全验证” copy remain in commit `a148ba0`. The user's uncommitted `ios/VexluneMobileConsole/Info.plist` formatting change is untouched.

## Local production-key acceptance (completed)

The current signed iOS simulator build was run against the unchanged production API using the configured production site key and the disposable account created during this QA session. The native diagnostic chain for request `v1-login-0-muu6y988hys8m989acu` was:

```text
phase=config-read status=enabled durationMs=702
phase=page-load status=started
phase=page-load status=loaded durationMs=20854 pageVersion=bridge-v1
phase=widget-ready status=ready durationMs=20908 pageVersion=bridge-v1
phase=token status=received
phase=business-submit status=accepted durationMs=439
```

The app then displayed the authenticated `个人工作台` for `codex-vexlune-20261005@example.com`. The token, password, cookies, and session values were not logged. This proves the real iOS simulator → Cloudflare token → official auth API → session/workspace route, while it does not prove a physical-device or TestFlight run.

An earlier unsigned/adhoc simulator package produced `setValueWithKeyAsync … A required entitlement isn't present` while persisting the successful session. Rebuilding the checked-in Xcode workspace with the local Apple Development setup and installing that package removed the storage error; the successful acceptance above used that signed Debug simulator artifact. The release script still defaults to unsigned simulator output for packaging and must be run with the project's signing settings for device QA.

## Still pending

- The production `/mobile/turnstile` route is still the ordinary SPA shell. The native app currently uses its app-owned HTML fallback with the same-origin base URL, so publishing the dedicated web route remains a separate release operation.
- No production credentials, Cloudflare secret, cache purge, server restart, or Cloudflare rule change was performed.
- A physical iPhone/TestFlight run and an official test-key run remain release QA items.
