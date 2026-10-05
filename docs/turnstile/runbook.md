# Turnstile diagnostic and release runbook

## Local diagnosis

1. Record the worktree and build identity: `git status --short --branch`, `git rev-parse HEAD`, `pnpm typecheck`, and the iOS bundle/build values from `app.json`/`Info.plist`.
2. Check the public settings response without printing secrets:

   ```sh
   curl -fsS https://hub.vexlune.com/api/v1/settings/public | jq '.data | {turnstile_enabled, turnstile_site_key: (.turnstile_site_key != null and .turnstile_site_key != ""), aliyun_captcha_enabled, tencent_captcha_enabled}'
   ```

3. Check the dedicated page and its content type/title. It must not be the ordinary homepage:

   ```sh
   curl -fsSL -D /tmp/turnstile.headers https://hub.vexlune.com/mobile/turnstile -o /tmp/turnstile.html
   rg -n 'MobileTurnstile|turnstile/v0/api.js|Vexlune Hub - AI API Gateway' /tmp/turnstile.html
   ```

4. Run `pnpm typecheck && pnpm lint && pnpm test && pnpm run verify:production-scan`. Inspect development logs for the ordered phases and the same build ID/component ID/bridge version.
5. Compare the same URL in a normal browser, a minimal visible WebView, and the native auth form. A browser success cannot stand in for native bridge or backend Siteverify success.

For simulator auth acceptance, install a signed Debug artifact so iOS Keychain/SecureStore is available:

```sh
xcodebuild -workspace ios/VexluneMobileConsole.xcworkspace \
  -scheme VexluneMobileConsole -configuration Debug -sdk iphonesimulator \
  -destination 'id=<simulator-udid>' -derivedDataPath build/ios-signed \
  CODE_SIGN_IDENTITY='Apple Development' CODE_SIGNING_ALLOWED=YES \
  CODE_SIGNING_REQUIRED=YES DEVELOPMENT_TEAM=6KW552MWV6 build
xcrun simctl install <simulator-udid> build/ios-signed/Build/Products/Debug-iphonesimulator/VexluneMobileConsole.app
```

An unsigned/adhoc simulator package can reach the auth API but fail when `expo-secure-store` writes the accepted session (`errSecMissingEntitlement`). Treat that as a build/signing failure, not an authentication failure.

The auth gate loads the real `https://hub.vexlune.com/mobile/turnstile` HTTPS URL with a per-instance fragment tuple. The production web route must be deployed before native acceptance; the app does not use `file://`, `data:` or app-owned HTML as a fallback. The WebView remains visible after the user submits so an interactive provider challenge can be completed. Do not put a secret, credential, or hard-coded production token in the native bundle.

## Required release operation (approval required)

The current production route is missing. The release owner must publish the frontend bundle containing `/mobile/turnstile` from the approved backend/frontend build. Do not change the official Sub2API `0.2.13` backend version, auth endpoints, database, secret key, or Cloudflare rules.

Before publishing, verify the route is included in the web router, is allowed as a public path, and the page uses the production site's Turnstile site key. Keep the Cloudflare secret server-side. After publishing, clear only the affected HTML/document cache if the deployment system caches the SPA shell; do not disable the challenge or purge unrelated data.

The current response is `cache-control: no-cache`/`cf-cache-status: DYNAMIC`; the referenced `index-xMHQ6xfX.js` is an immutable HIT (`max-age=31536000`, observed age about 80,495 seconds). A correct release must replace the hashed entrypoint in the HTML; clearing stale HTML is normally sufficient and an old immutable chunk must not be overwritten in place.

Post-release smoke checks:

```sh
curl -fsSL https://hub.vexlune.com/mobile/turnstile | rg 'MobileTurnstile|turnstile/v0/api.js'
curl -fsS https://hub.vexlune.com/api/v1/settings/public | jq '.data.turnstile_enabled'
```

Then run the native simulator and a real iPhone. Complete one normal login and one registration attempt, and correlate the native request ID with the server's Siteverify/request audit. Do not record the token, password, cookie, or session.

## Rollback

1. Restore the previously approved frontend bundle/artifact.
2. Clear only the corresponding document/HTML cache.
3. Confirm `/mobile/turnstile` no longer advertises the failed bundle and that the existing login page still serves.
4. Leave Turnstile enabled and keep the auth API and secret unchanged. If the rollback requires a service restart, record the exact unit/container and restore the previous artifact before restarting.

No production operation in this runbook has been executed in this task.
