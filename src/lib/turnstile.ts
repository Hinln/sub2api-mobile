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
  | { kind: 'agreement-required' }
  | { kind: 'agreement-accepted' }
  | { kind: 'agreement-accept-failed' }
  | { kind: 'widget-ready' }
  | { kind: 'expired' }
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
  var agreementSent = false;
  var widgetSent = false;
  function wasPatched(api) { return patched.indexOf(api) !== -1; }
  function postToken(token) {
    if (sent || typeof token !== 'string' || token.length < 20) return;
    sent = true;
    if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'turnstile_token', origin: window.location.origin, token: token }));
    }
  }
  function detectAgreement() {
    if (agreementSent || window.__vexluneAgreementAccepted || !document.body) return;
    var dialogs = Array.prototype.slice.call(document.querySelectorAll('[role="dialog"], [aria-modal="true"], dialog'));
    var scope = dialogs.length ? dialogs[dialogs.length - 1] : document.body;
    var text = (scope.innerText || '').replace(/\\s+/g, ' ');
    if (!/(服务条款|terms of service|terms & conditions)/i.test(text)) return;
    var controls = Array.prototype.slice.call(scope.querySelectorAll('button, a, [role="button"]'));
    if (!controls.some(function (node) { return /^(同意(?:并继续)?|接受(?:并继续)?|agree(?: and continue)?|accept(?: and continue)?)$/i.test((node.innerText || node.textContent || '').replace(/\\s+/g, ' ').trim()); })) return;
    agreementSent = true;
    if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'agreement_required', origin: window.location.origin }));
    }
  }
  function detectWidget() {
    if (widgetSent || (agreementSent && !window.__vexluneAgreementAccepted) || !document.body) return;
    if (!document.querySelector('iframe[src*="challenges.cloudflare.com"]')) return;
    widgetSent = true;
    if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'widget_ready', origin: window.location.origin }));
    }
  }
  function patch(api) {
    if (!api || typeof api.render !== 'function' || wasPatched(api)) return;
    var originalRender = api.render;
    try {
      api.render = function (container, options) {
        options = options || {};
        var originalCallback = options.callback;
        var originalExpiredCallback = options['expired-callback'];
        var originalErrorCallback = options['error-callback'];
        var wrappedOptions = Object.assign({}, options, {
          callback: function (token) {
            postToken(token);
            if (typeof originalCallback === 'function') originalCallback(token);
          },
          'expired-callback': function () {
            sent = false;
            if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'turnstile_expired', origin: window.location.origin }));
            if (typeof originalExpiredCallback === 'function') originalExpiredCallback();
          },
          'error-callback': function () {
            sent = false;
            if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'turnstile_unavailable', origin: window.location.origin }));
            if (typeof originalErrorCallback === 'function') originalErrorCallback();
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
  function observe() { patch(window.turnstile); detectAgreement(); detectWidget(); }
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

/**
 * The native bottom notice is the user-facing consent surface. After the user
 * presses the login or registration action, this script clicks the equivalent
 * control in the official first-party page so that the page records the same
 * consent and can continue rendering Turnstile. It is never injected before
 * that action.
 */
export const TURNSTILE_PAGE_ACCEPT_AGREEMENT_SCRIPT = `
(function () {
  function accept() {
    var dialogs = Array.prototype.slice.call(document.querySelectorAll('[role="dialog"], [aria-modal="true"], dialog'));
    var roots = dialogs.length ? dialogs : [document.body];
    var nodes = roots.reduce(function (all, root) { return all.concat(Array.prototype.slice.call(root.querySelectorAll('button, a, [role="button"]'))); }, []);
    var target = nodes.find(function (node) {
      var text = (node.innerText || node.textContent || '').replace(/\\s+/g, ' ').trim();
      return /^(同意(?:并继续)?|接受(?:并继续)?|agree(?: and continue)?|accept(?: and continue)?)$/i.test(text);
    });
    if (!target) return false;
    target.click();
    window.__vexluneAgreementAccepted = true;
    if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'agreement_accepted', origin: window.location.origin }));
    return true;
  }
  var attempts = 0;
  var timer = setInterval(function () {
    attempts += 1;
    if (accept()) clearInterval(timer);
    else if (attempts >= 150) {
      clearInterval(timer);
      if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'agreement_accept_failed', origin: window.location.origin }));
    }
  }, 100);
})();
true;
`;

export function parseTurnstilePageMessage(raw: string, expectedOrigin: string): ParsedTurnstileMessage {
  try {
    const value = JSON.parse(raw) as TurnstilePageMessage;
    if (value.type === 'agreement_required' && value.origin === expectedOrigin) return { kind: 'agreement-required' };
    if (value.type === 'agreement_accepted' && value.origin === expectedOrigin) return { kind: 'agreement-accepted' };
    if (value.type === 'agreement_accept_failed' && value.origin === expectedOrigin) return { kind: 'agreement-accept-failed' };
    if (value.type === 'widget_ready' && value.origin === expectedOrigin) return { kind: 'widget-ready' };
    if (value.type === 'turnstile_expired' && value.origin === expectedOrigin) return { kind: 'expired' };
    if (value.type === 'turnstile_unavailable') return { kind: 'unavailable' };
    if (value.type !== 'turnstile_token' || value.origin !== expectedOrigin || typeof value.token !== 'string' || value.token.length < 20) return null;
    return { kind: 'token', token: value.token };
  } catch {
    return null;
  }
}
