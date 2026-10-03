export type TurnstileBridgeMessage = {
  type?: string;
  nonce?: string;
  action?: string;
  token?: string;
  origin?: string;
};

export type ParsedTurnstileMessage =
  | { kind: 'token'; token: string }
  | { kind: 'bridge_error' }
  | null;

/**
 * The bridge page is first-party HTML. If an origin serves its SPA shell at
 * this path, the WebView must fail closed instead of showing that shell as a
 * security control.
 */
export const TURNSTILE_BRIDGE_PROBE_SCRIPT = `
(function () {
  function probe() {
    var root = document.getElementById('widget');
    var status = document.getElementById('status');
    var isBridge = !!root && !!status && document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
    if (!window.ReactNativeWebView || typeof window.ReactNativeWebView.postMessage !== 'function') return false;
    if (!isBridge) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'turnstile_bridge_error' }));
    return true;
  }
  if (probe()) return;
  var attempts = 0;
  var timer = setInterval(function () {
    attempts += 1;
    if (probe() || attempts >= 50) clearInterval(timer);
  }, 100);
})();
true;
`;

export function parseTurnstileBridgeMessage(raw: string, expectedOrigin: string, expectedNonce: string, expectedAction: string): ParsedTurnstileMessage {
  try {
    const value = JSON.parse(raw) as TurnstileBridgeMessage;
    if (value.type === 'turnstile_bridge_error') return { kind: 'bridge_error' };
    if (value.origin !== expectedOrigin || value.type !== 'turnstile_token' || value.nonce !== expectedNonce || value.action !== expectedAction || typeof value.token !== 'string' || value.token.length < 20) return null;
    return { kind: 'token', token: value.token };
  } catch {
    return null;
  }
}
