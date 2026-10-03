import { describe, expect, it, vi } from 'vitest';
vi.mock('expo-crypto', () => ({ getRandomValues: vi.fn() }));
import * as ExpoCrypto from 'expo-crypto';
import { createTurnstileNonce, parseTurnstileBridgeMessage, TURNSTILE_BRIDGE_PROBE_SCRIPT } from '@/src/lib/turnstile';

describe('turnstile bridge contract', () => {
  const origin = 'https://hub.vexlune.com';
  const nonce = 'abc123';

  it('accepts only the matching one-shot token envelope', () => {
    expect(parseTurnstileBridgeMessage(JSON.stringify({ type: 'turnstile_token', origin, nonce, action: 'login', token: 'x'.repeat(20) }), origin, nonce, 'login')).toEqual({ kind: 'token', token: 'x'.repeat(20) });
    expect(parseTurnstileBridgeMessage(JSON.stringify({ type: 'turnstile_token', origin, nonce, action: 'register', token: 'x'.repeat(20) }), origin, nonce, 'login')).toBeNull();
    expect(parseTurnstileBridgeMessage(JSON.stringify({ type: 'turnstile_token', origin: 'https://evil.example', nonce, action: 'login', token: 'x'.repeat(20) }), origin, nonce, 'login')).toBeNull();
  });

  it('fails closed when the origin returns its SPA instead of the bridge', () => {
    expect(parseTurnstileBridgeMessage(JSON.stringify({ type: 'turnstile_bridge_error' }), origin, nonce, 'login')).toEqual({ kind: 'bridge_error' });
    expect(TURNSTILE_BRIDGE_PROBE_SCRIPT).toContain('turnstile_bridge_error');
    expect(TURNSTILE_BRIDGE_PROBE_SCRIPT).toContain("getElementById('widget')");
    expect(TURNSTILE_BRIDGE_PROBE_SCRIPT).toContain('setInterval');
  });

  it('creates a fixed-length nonce from the secure random source', () => {
    const generated = createTurnstileNonce((bytes) => {
      bytes.fill(0xab);
      return bytes;
    });
    expect(generated).toBe('ab'.repeat(24));
  });

  it('fails closed when the random source throws', () => {
    expect(createTurnstileNonce(() => { throw new Error('unavailable'); })).toBe('');
  });

  it('uses the native Expo secure random source when Web Crypto is unavailable', () => {
    const getRandomValues = vi.spyOn(ExpoCrypto, 'getRandomValues').mockImplementation((bytes) => {
      bytes.fill(0x5a);
      return bytes;
    });
    vi.stubGlobal('crypto', undefined);
    expect(createTurnstileNonce()).toBe('5a'.repeat(24));
    expect(getRandomValues).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
    getRandomValues.mockRestore();
  });
});
