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

The same result is visible in a normal browser: navigating to `/mobile/turnstile` ends at `/login?redirect=/mobile/turnstile`, and the DOM is the login form with no `MobileTurnstile`, `ReactNativeWebView`, or Turnstile SDK marker. The current URI build (`ee85bf0`, bundle `1.0.1 (2)`) is installed on the iPhone 17 Pro Max simulator. Entering disposable dummy credentials and tapping 登录 briefly shows “正在加载安全验证…”, then the native gate records the same-origin auth-page takeover and displays “安全验证专用页未部署或被登录页接管，请联系管理员发布 /mobile/turnstile 后重试。” No dedicated challenge surface appears. This is a route/bundle failure, not evidence that a real challenge was solved or rejected.

The current native gate now classifies a same-origin auth-page takeover as `dedicated_page_wrong_route`, stops rendering the nested page, clears the pending token, and reports that `/mobile/turnstile` must be deployed. This makes the first missing lifecycle event explicit without bypassing the provider or weakening the origin/tuple checks.

## Historical app-owned fallback evidence (superseded)

An earlier local build temporarily used an app-owned HTML document with an HTTPS
`baseUrl` while the production route was stale. That implementation is retained
here only as incident history; it was removed because the release contract
requires the native WebView to load the deployed first-party HTTPS page itself.
The historical WebKit run recorded the `loadDataWithNavigation` document and a
public settings response (HTTP 200, 85,842 bytes) but no token.

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
- The current native gate loads `source={{uri: buildTurnstilePageUrl(context)}}`,
  keeps the dedicated page visible after submit, and does not ship an inline
  HTML or transparent WebView fallback.

The previous auth-switch crash fix and the “提交时加载安全验证” copy remain in commit `a148ba0`. The user's uncommitted `ios/VexluneMobileConsole/Info.plist` formatting change is untouched.

## Historical production-key acceptance (fallback build only)

The signed iOS simulator evidence below belongs to the superseded fallback build,
not the current URI implementation. It was run against the unchanged production
API using the configured production site key and a disposable account. The native
diagnostic chain for request `v1-login-0-muu6y988hys8m989acu` was:

```text
phase=config-read status=enabled durationMs=702
phase=page-load status=started
phase=page-load status=loaded durationMs=20854 pageVersion=bridge-v1
phase=widget-ready status=ready durationMs=20908 pageVersion=bridge-v1
phase=token status=received
phase=business-submit status=accepted durationMs=439
```

The app then displayed the authenticated `个人工作台` for `codex-vexlune-20261005@example.com`. The token, password, cookies, and session values were not logged. This proves the real iOS simulator → Cloudflare token → official auth API → session/workspace route for that historical build; it does not prove the current URI build, a physical device, or TestFlight.

An earlier unsigned/adhoc simulator package produced `setValueWithKeyAsync … A required entitlement isn't present` while persisting the successful session. Rebuilding the checked-in Xcode workspace with the local Apple Development setup and installing that package removed the storage error; the successful acceptance above used that signed Debug simulator artifact. The release script still defaults to unsigned simulator output for packaging and must be run with the project's signing settings for device QA.

## Still pending

- The production `/mobile/turnstile` route is still the ordinary SPA shell. The current native app now loads that HTTPS route directly, so publishing the dedicated web route is required before the URI build can complete a real challenge.
- The current URI build has been rebuilt, signed, installed, and run on the simulator; it correctly fails closed on the undeployed route. A real token and business login remain unverified until the production web route is published.
- No production credentials, Cloudflare secret, cache purge, server restart, or Cloudflare rule change was performed.
- A physical iPhone/TestFlight run and an official test-key run remain release QA items.
