/**
 * The official Sub2API server accepts a Turnstile token directly on its
 * authentication endpoints. It does not expose the private mobile bridge
 * that used to exist in this client. The native client therefore loads the
 * official first-party login/register page in a WebView and wraps the public
 * Turnstile render callback so the solved token can be handed back to React
 * Native. The page remains on the first-party origin, so Cloudflare sees the
 * same hostname that the official web client uses.
 */

export type TurnstilePageMessage = {
  type?: string;
  token?: string;
  origin?: string;
};

export type ParsedTurnstileMessage =
  | { kind: 'token'; token: string }
  | { kind: 'unavailable' }
  | null;

/**
 * Runs before the official page scripts. It observes the official
 * `window.turnstile.render` API and wraps only the callback supplied by the
 * official page. No token is fabricated and no challenge is skipped.
 *
 * The setter plus short polling window covers both Turnstile SDK loading
 * orders used by the official frontend. The wrapper calls the original
 * callback as well, so the page keeps its normal state and expiry handling.
 */
export const TURNSTILE_PAGE_CAPTURE_SCRIPT = `
(function () {
  var patched = [];
  var sent = false;
  function wasPatched(api) { return patched.indexOf(api) !== -1; }
  function postToken(token) {
    if (sent || typeof token !== 'string' || token.length < 20) return;
    sent = true;
    if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'turnstile_token', origin: window.location.origin, token: token }));
    }
  }
  function patch(api) {
    if (!api || typeof api.render !== 'function' || wasPatched(api)) return;
    var originalRender = api.render;
    try {
      api.render = function (container, options) {
        options = options || {};
        var originalCallback = options.callback;
        var wrappedOptions = Object.assign({}, options, {
          callback: function (token) {
            postToken(token);
            if (typeof originalCallback === 'function') originalCallback(token);
          }
        });
        return originalRender.call(this, container, wrappedOptions);
      };
      patched.push(api);
    } catch (_) {
      // A future SDK may expose a frozen API. Polling will keep trying while
      // the page remains open, and the native side will fail closed otherwise.
    }
  }
  function observe() { patch(window.turnstile); }
  try {
    var current = window.turnstile;
    Object.defineProperty(window, 'turnstile', {
      configurable: true,
      enumerable: true,
      get: function () { return current; },
      set: function (value) { current = value; patch(value); }
    });
  } catch (_) {
    // The polling fallback below handles non-configurable globals.
  }
  observe();
  var timer = setInterval(observe, 25);
  setTimeout(function () { clearInterval(timer); }, 30000);
})();
true;
`;

/**
 * Keeps the official page's widget visible in the small native challenge
 * surface while hiding its unrelated login form. This is cosmetic only; the
 * challenge iframe and official page scripts remain untouched.
 */
export const TURNSTILE_PAGE_FOCUS_SCRIPT = `
(function () {
  function focusWidget() {
    var frame = document.querySelector('iframe[src*="challenges.cloudflare.com"]');
    if (!frame) return false;
    var node = frame;
    while (node.parentElement && node.parentElement !== document.body) {
      var parent = node.parentElement;
      Array.prototype.forEach.call(parent.children, function (child) {
        if (child !== node) child.style.display = 'none';
      });
      node = parent;
    }
    if (document.body) {
      document.body.style.margin = '0';
      document.body.style.minHeight = '90px';
      document.body.style.overflow = 'hidden';
      Array.prototype.forEach.call(document.body.children, function (child) {
        if (child !== node) child.style.display = 'none';
      });
    }
    frame.style.display = 'block';
    frame.scrollIntoView({ block: 'center', inline: 'center' });
    return true;
  }
  var attempts = 0;
  var timer = setInterval(function () {
    attempts += 1;
    if (focusWidget() || attempts >= 120) clearInterval(timer);
  }, 100);
})();
true;
`;

export function parseTurnstilePageMessage(raw: string, expectedOrigin: string): ParsedTurnstileMessage {
  try {
    const value = JSON.parse(raw) as TurnstilePageMessage;
    if (value.type === 'turnstile_unavailable') return { kind: 'unavailable' };
    if (value.type !== 'turnstile_token' || value.origin !== expectedOrigin || typeof value.token !== 'string' || value.token.length < 20) return null;
    return { kind: 'token', token: value.token };
  } catch {
    return null;
  }
}
