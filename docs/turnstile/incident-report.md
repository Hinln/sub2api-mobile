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

## Not yet proven

- The dedicated route has not been published to production, so no real production callback or Siteverify success can be claimed.
- No production credentials, tokens, Cloudflare secret, cache purge, server restart, or Cloudflare rule change was performed.
- A real-device run and an official test-key run remain required after the route is deployed.
