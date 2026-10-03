import { describe, expect, it } from 'vitest';
import { parseTurnstilePageMessage, TURNSTILE_PAGE_ACCEPT_AGREEMENT_SCRIPT, TURNSTILE_PAGE_CAPTURE_SCRIPT, TURNSTILE_PAGE_FOCUS_SCRIPT } from '@/src/lib/turnstile';

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

  it('surfaces first-party agreement state and only exposes an explicit accept script', () => {
    expect(parseTurnstilePageMessage(JSON.stringify({ type: 'agreement_required', origin }), origin)).toEqual({ kind: 'agreement-required' });
    expect(parseTurnstilePageMessage(JSON.stringify({ type: 'agreement_required', origin: 'https://evil.example' }), origin)).toBeNull();
    expect(parseTurnstilePageMessage(JSON.stringify({ type: 'agreement_accepted', origin }), origin)).toEqual({ kind: 'agreement-accepted' });
    expect(parseTurnstilePageMessage(JSON.stringify({ type: 'agreement_accept_failed', origin }), origin)).toEqual({ kind: 'agreement-accept-failed' });
    expect(parseTurnstilePageMessage(JSON.stringify({ type: 'widget_ready', origin }), origin)).toEqual({ kind: 'widget-ready' });
    expect(parseTurnstilePageMessage(JSON.stringify({ type: 'turnstile_expired', origin }), origin)).toEqual({ kind: 'expired' });
    expect(TURNSTILE_PAGE_CAPTURE_SCRIPT).toContain('agreement_required');
    expect(TURNSTILE_PAGE_CAPTURE_SCRIPT).toContain('__vexluneAgreementAccepted');
    expect(TURNSTILE_PAGE_ACCEPT_AGREEMENT_SCRIPT).toContain('同意(?:并继续)?');
    expect(TURNSTILE_PAGE_ACCEPT_AGREEMENT_SCRIPT).toContain('agreement_accept_failed');
  });

  it('rejects malformed messages', () => {
    expect(parseTurnstilePageMessage('not-json', origin)).toBeNull();
    expect(parseTurnstilePageMessage(JSON.stringify({ type: 'turnstile_token', origin }), origin)).toBeNull();
  });
});
