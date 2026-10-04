/**
 * Shared contract for the first-party /mobile/turnstile page.
 *
 * The page is deliberately a small, same-origin Turnstile host. It never
 * receives credentials or session tokens. Bridge payloads are untrusted
 * until the native side verifies the page origin and current instance tuple.
 */

export const TURNSTILE_BRIDGE_VERSION = 1 as const;
export const TURNSTILE_PAGE_VERSION = 'bridge-v1' as const;
export const TURNSTILE_COMPONENT_ID = 'cloudflare-turnstile-explicit' as const;
export const TURNSTILE_PAGE_PATH = '/mobile/turnstile' as const;
export const TURNSTILE_TOKEN_MAX_LENGTH = 2048;
/** Refresh a token before the provider's documented five-minute lifetime. */
export const TURNSTILE_LOCAL_REFRESH_MS = 240_000;

export type TurnstileAction = 'login' | 'register' | 'forgot_password';
export type TurnstileBridgeType =
  | 'ready'
  | 'success'
  | 'error'
  | 'expired'
  | 'before-interactive'
  | 'after-interactive'
  | 'unsupported'
  | 'disabled';

export type TurnstileBridgeMessage = {
  version: typeof TURNSTILE_BRIDGE_VERSION;
  type: TurnstileBridgeType;
  requestId: string;
  nonce: string;
  action: TurnstileAction;
  token?: string;
  errorCode?: string;
};

export type ParsedTurnstileMessage =
  | { kind: 'ready' }
  | { kind: 'token'; token: string }
  | { kind: 'error'; errorCode: string }
  | { kind: 'expired' }
  | { kind: 'before-interactive' }
  | { kind: 'after-interactive' }
  | { kind: 'unsupported'; errorCode?: string }
  | { kind: 'disabled' }
  | null;

export type TurnstileStatus = 'loading' | 'disabled' | 'waiting' | 'ready' | 'token' | 'error';
export type TurnstilePresentation = 'inline' | 'silent';

export type TurnstileBridgeContext = {
  origin: string;
  requestId: string;
  nonce: string;
  action: TurnstileAction;
};

export function isUsableTurnstileToken(token: string | undefined | null): token is string {
  return typeof token === 'string'
    && token.length >= 20
    && token.length <= TURNSTILE_TOKEN_MAX_LENGTH
    && token.trim() === token;
}

export function canSubmitTurnstile(status: TurnstileStatus, token: string | undefined | null): boolean {
  if (status === 'disabled') return true;
  return status === 'token' && isUsableTurnstileToken(token);
}

/**
 * The native transport is created only after a user submits the form. Silent
 * mode changes presentation only; it never makes an enabled provider optional.
 */
export function shouldRenderTurnstileTransport(
  presentation: TurnstilePresentation,
  enabled: boolean | null,
  challengeRequested: boolean,
): boolean {
  return enabled === true && challengeRequested;
}

/**
 * The WebView key must include the local instance counter. A fragment-only URL
 * update is not guaranteed to remount the document on every WKWebView version.
 */
export function buildTurnstileWebViewKey(action: TurnstileAction, resetKey: number, instanceKey: number): string {
  return `${action}-${resetKey}-${instanceKey}`;
}

function isAction(value: unknown): value is TurnstileAction {
  return value === 'login' || value === 'register' || value === 'forgot_password';
}

function isBridgeType(value: unknown): value is TurnstileBridgeType {
  return value === 'ready'
    || value === 'success'
    || value === 'error'
    || value === 'expired'
    || value === 'before-interactive'
    || value === 'after-interactive'
    || value === 'unsupported'
    || value === 'disabled';
}

function isSafeIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128 && /^[A-Za-z0-9._~-]+$/.test(value);
}

/** Validate every field, including non-success messages, against this page instance. */
export function parseTurnstilePageMessage(raw: string, context: TurnstileBridgeContext): ParsedTurnstileMessage {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 8192) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value.version !== TURNSTILE_BRIDGE_VERSION
      || !isBridgeType(value.type)
      || !isSafeIdentifier(value.requestId)
      || !isSafeIdentifier(value.nonce)
      || !isAction(value.action)
      || value.requestId !== context.requestId
      || value.nonce !== context.nonce
      || value.action !== context.action) return null;

    if (value.type === 'success') {
      const token = typeof value.token === 'string' ? value.token : null;
      return isUsableTurnstileToken(token) ? { kind: 'token', token } : null;
    }
    if (value.type === 'error') {
      const errorCode = typeof value.errorCode === 'string' && value.errorCode.length <= 128 ? value.errorCode : 'unknown';
      return { kind: 'error', errorCode };
    }
    if (value.type === 'unsupported') {
      return { kind: 'unsupported', ...(typeof value.errorCode === 'string' && value.errorCode.length <= 128 ? { errorCode: value.errorCode } : {}) };
    }
    if (value.type === 'ready') return { kind: 'ready' };
    if (value.type === 'expired') return { kind: 'expired' };
    if (value.type === 'before-interactive') return { kind: 'before-interactive' };
    if (value.type === 'after-interactive') return { kind: 'after-interactive' };
    return { kind: 'disabled' };
  } catch {
    return null;
  }
}

export function createTurnstileBridgeContext(origin: string, action: TurnstileAction, resetKey: number): TurnstileBridgeContext {
  const random = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
  return { origin, action, requestId: `v1-${action}-${resetKey}-${random()}`, nonce: random() };
}

export function buildTurnstilePageUrl(context: TurnstileBridgeContext): string {
  const fragment = new URLSearchParams({
    version: String(TURNSTILE_BRIDGE_VERSION),
    requestId: context.requestId,
    nonce: context.nonce,
    action: context.action,
  });
  return `${context.origin}${TURNSTILE_PAGE_PATH}#${fragment.toString()}`;
}

/**
 * Build the same dedicated page as an app-owned HTML document for environments
 * where the production frontend route has not been published yet. The
 * WebView's baseURL remains the approved HTTPS origin, so settings and the
 * official widget load from that origin; no secret or credential is embedded.
 */
export function buildTurnstileInlinePageHtml(context: TurnstileBridgeContext, siteKey?: string): string {
  const serializedContext = JSON.stringify({
    requestId: context.requestId,
    nonce: context.nonce,
    action: context.action,
  }).replace(/</g, '\\u003c');
  const serializedSiteKey = JSON.stringify(siteKey?.trim() ?? '').replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Security verification</title><style>html,body{margin:0;min-height:100%;background:transparent}#turnstile{width:320px;min-height:65px;display:flex;align-items:center;justify-content:center}</style><script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script></head><body><div id="turnstile" aria-label="Security verification"></div><script>
(() => {
  if (window.__vexluneTurnstileBooted) return;
  window.__vexluneTurnstileBooted = true;
  const context = ${serializedContext};
  const configuredSiteKey = ${serializedSiteKey};
  const BRIDGE_VERSION = ${TURNSTILE_BRIDGE_VERSION};
  const hasBridge = () => Boolean(window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function');
  const waitForBridge = () => new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      if (hasBridge()) return resolve();
      attempts += 1;
      if (attempts >= 120) return reject(new Error('native_bridge_missing'));
      setTimeout(check, 50);
    };
    check();
  });
  const post = (type, fields = {}) => {
    const payload = JSON.stringify({ version: BRIDGE_VERSION, type, ...context, ...fields });
    let attempts = 0;
    const send = () => {
      if (hasBridge()) {
        window.ReactNativeWebView.postMessage(payload);
        return;
      }
      attempts += 1;
      if (attempts < 120) setTimeout(send, 50);
    };
    send();
  };
  const fail = (code) => post('error', { errorCode: String(code || 'page_error').slice(0, 128) });
  const waitForSdkRender = () => new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      if (window.turnstile && typeof window.turnstile.render === 'function') return resolve();
      attempts += 1;
      if (attempts >= 200) return reject(new Error('sdk_render_unavailable'));
      setTimeout(check, 50);
    };
    check();
  });
  const loadSdk = () => new Promise((resolve, reject) => {
    if (window.turnstile && typeof window.turnstile.render === 'function') return resolve();
    const existing = document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]');
    if (existing) {
      // The HTML head already includes the official async script. Do not add a
      // second copy: the provider rejects duplicate api.js instances and can
      // leave a placeholder turnstile object whose render method throws.
      void waitForSdkRender().then(resolve, reject);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => { void waitForSdkRender().then(resolve, reject); };
    script.onerror = () => reject(new Error('sdk_load_failed'));
    document.head.appendChild(script);
  });
  const init = async () => {
    try {
      // WKWebView installs ReactNativeWebView at document start, but on some
      // iOS releases loadHTMLString can run the inline document before that
      // user script has completed. Wait briefly instead of classifying a
      // healthy page as unsupported and dropping the entire callback chain.
      await waitForBridge();
      let siteKey = configuredSiteKey;
      if (!siteKey) {
        const response = await fetch('/api/v1/settings/public', { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
        const payload = await response.json();
        const settings = payload && payload.data && typeof payload.data === 'object' ? payload.data : payload;
        if (settings && settings.turnstile_enabled === false) return post('disabled');
        siteKey = settings && typeof settings.turnstile_site_key === 'string' ? settings.turnstile_site_key.trim() : '';
        if (!response.ok || !settings || settings.turnstile_enabled !== true || !siteKey) return fail('config_invalid');
      }
      if (!siteKey) return fail('config_invalid');
      await loadSdk();
      if (!window.turnstile || typeof window.turnstile.render !== 'function') return fail('sdk_render_unavailable');
      window.turnstile.render(document.getElementById('turnstile'), {
        sitekey: siteKey,
        action: context.action,
        theme: 'light',
        // Keep the provider control hidden on the normal managed path. The
        // native gate still reveals its viewport when this callback reports a
        // real human interaction challenge.
        appearance: 'interaction-only',
        size: 'flexible',
        callback: (token) => { if (typeof token === 'string' && token.length >= 20 && token.length <= 2048) post('success', { token }); },
        'before-interactive-callback': () => post('before-interactive'),
        'after-interactive-callback': () => post('after-interactive'),
        'expired-callback': () => post('expired'),
        'error-callback': (code) => fail(code || 'turnstile_error'),
      });
      post('ready');
    } catch (error) { fail(error && error.message ? error.message : 'page_error'); }
  };
  void init();
})();
</script></body></html>`;
}

/**
 * Run the same page bootstrap at WebView document end. WKWebView executes
 * inline HTML scripts reliably on most releases, but an end-of-document
 * injection is needed on releases that defer loadHTMLString inline scripts.
 * The page-level boot guard makes this safe when both paths run.
 */
export function buildTurnstileInlinePageScript(context: TurnstileBridgeContext, siteKey?: string): string {
  const html = buildTurnstileInlinePageHtml(context, siteKey);
  return `${html.match(/<script>([\s\S]*)<\/script>/)?.[1] ?? ''}\ntrue;`;
}
