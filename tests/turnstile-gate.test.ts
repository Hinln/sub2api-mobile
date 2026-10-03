import { describe, expect, it } from 'vitest';
import { parseTurnstilePageMessage, TURNSTILE_PAGE_CAPTURE_SCRIPT, TURNSTILE_PAGE_FOCUS_SCRIPT } from '@/src/lib/turnstile';

describe('official Turnstile WebView contract', () => {
  const origin = 'https://hub.vexlune.com';

  it('accepts only a token posted by the expected first-party page', () => {
    expect(parseTurnstilePageMessage(JSON.stringify({ type: 'turnstile_token', origin, token: 'x'.repeat(20) }), origin)).toEqual({ kind: 'token', token: 'x'.repeat(20) });
    expect(parseTurnstilePageMessage(JSON.stringify({ type: 'turnstile_token', origin: 'https://evil.example', token: 'x'.repeat(20) }), origin)).toBeNull();
    expect(parseTurnstilePageMessage(JSON.stringify({ type: 'turnstile_token', origin, token: 'short' }), origin)).toBeNull();
  });

  it('fails closed when the official widget is unavailable', () => {
    expect(parseTurnstilePageMessage(JSON.stringify({ type: 'turnstile_unavailable' }), origin)).toEqual({ kind: 'unavailable' });
    expect(TURNSTILE_PAGE_CAPTURE_SCRIPT).toContain('window.turnstile');
    expect(TURNSTILE_PAGE_CAPTURE_SCRIPT).toContain('ReactNativeWebView.postMessage');
    expect(TURNSTILE_PAGE_FOCUS_SCRIPT).toContain('challenges.cloudflare.com');
  });

  it('rejects malformed messages', () => {
    expect(parseTurnstilePageMessage('not-json', origin)).toBeNull();
    expect(parseTurnstilePageMessage(JSON.stringify({ type: 'turnstile_token', origin }), origin)).toBeNull();
  });
});
