import { describe, expect, it } from 'vitest';
import {
  buildTurnstilePageUrl,
  buildTurnstileWebViewKey,
  canSubmitTurnstile,
  createTurnstileBridgeContext,
  isUsableTurnstileToken,
  parseTurnstilePageMessage,
} from '@/src/lib/turnstile';

describe('dedicated Turnstile bridge contract', () => {
  const context = {
    origin: 'https://hub.vexlune.com',
    requestId: 'v1-login-0-abcdefghijk',
    nonce: 'nonce-12345678',
    action: 'login' as const,
  };
  const message = (type: string, fields: Record<string, unknown> = {}) => JSON.stringify({ version: 1, type, requestId: context.requestId, nonce: context.nonce, action: context.action, ...fields });

  it('accepts only a success message for the current page instance', () => {
    const token = 'x'.repeat(20);
    expect(parseTurnstilePageMessage(message('success', { token }), context)).toEqual({ kind: 'token', token });
    expect(parseTurnstilePageMessage(message('success', { token }), { ...context, nonce: 'other-nonce-123' })).toBeNull();
    expect(parseTurnstilePageMessage(message('success', { token }), { ...context, action: 'register' })).toBeNull();
    expect(parseTurnstilePageMessage(JSON.stringify({ ...JSON.parse(message('success', { token })), version: 2 }), context)).toBeNull();
  });

  it('validates all lifecycle messages and rejects malformed or oversized payloads', () => {
    expect(parseTurnstilePageMessage(message('ready'), context)).toEqual({ kind: 'ready' });
    expect(parseTurnstilePageMessage(message('before-interactive'), context)).toEqual({ kind: 'before-interactive' });
    expect(parseTurnstilePageMessage(message('after-interactive'), context)).toEqual({ kind: 'after-interactive' });
    expect(parseTurnstilePageMessage(message('expired'), context)).toEqual({ kind: 'expired' });
    expect(parseTurnstilePageMessage(message('error', { errorCode: '110200' }), context)).toEqual({ kind: 'error', errorCode: '110200' });
    expect(parseTurnstilePageMessage(message('unsupported', { errorCode: 'native_bridge_missing' }), context)).toEqual({ kind: 'unsupported', errorCode: 'native_bridge_missing' });
    expect(parseTurnstilePageMessage(message('disabled'), context)).toEqual({ kind: 'disabled' });
    expect(parseTurnstilePageMessage('not-json', context)).toBeNull();
    expect(parseTurnstilePageMessage(`${message('ready')}${'x'.repeat(8192)}`, context)).toBeNull();
  });

  it('enforces token size and submit state', () => {
    const token = 'x'.repeat(20);
    expect(isUsableTurnstileToken(token)).toBe(true);
    expect(isUsableTurnstileToken('x'.repeat(2049))).toBe(false);
    expect(isUsableTurnstileToken(` ${token}`)).toBe(false);
    expect(canSubmitTurnstile('loading', token)).toBe(false);
    expect(canSubmitTurnstile('ready', token)).toBe(false);
    expect(canSubmitTurnstile('error', token)).toBe(false);
    expect(canSubmitTurnstile('token', token)).toBe(true);
    expect(canSubmitTurnstile('disabled', '')).toBe(true);
  });

  it('builds an HTTPS same-origin page URL with a fresh fragment tuple', () => {
    const first = createTurnstileBridgeContext(context.origin, 'login', 0);
    const second = createTurnstileBridgeContext(context.origin, 'login', 1);
    const url = new URL(buildTurnstilePageUrl(first));
    expect(url.origin).toBe(context.origin);
    expect(url.pathname).toBe('/mobile/turnstile');
    expect(url.hash).toContain('requestId=');
    expect(first.requestId).not.toBe(second.requestId);
    expect(first.nonce).not.toBe(second.nonce);
  });

  it('keeps the HTTPS page URL limited to the bridge tuple', () => {
    const url = new URL(buildTurnstilePageUrl(context));
    expect(url.search).toBe('');
    expect(url.hash).toContain('version=1');
    expect(url.hash).toContain('action=login');
    expect(url.toString()).not.toContain('password');
    expect(url.toString()).not.toContain('turnstile_secret');
  });

  it('changes the WebView instance key when local refresh advances', () => {
    expect(buildTurnstileWebViewKey('login', 2, 0)).toBe('login-2-0');
    expect(buildTurnstileWebViewKey('login', 2, 1)).not.toBe(buildTurnstileWebViewKey('login', 2, 0));
  });

});
