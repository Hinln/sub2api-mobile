import { afterEach, describe, expect, it, vi } from 'vitest';
import { recordTurnstileDiagnostic } from '@/src/lib/turnstile-diagnostics';

describe('Turnstile diagnostics', () => {
  afterEach(() => vi.restoreAllMocks());

  it('emits a structured, redacted development event without token fields', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    recordTurnstileDiagnostic({
      phase: 'backend-reject',
      action: 'login',
      requestId: 'v1-login-0-abcdefgh',
      errorCode: 'provider token secret-value',
      httpStatus: 403,
      durationMs: -3,
    });

    expect(info).toHaveBeenCalledOnce();
    const line = String(info.mock.calls[0]?.[0]);
    expect(line).toContain('"scope":"turnstile"');
    expect(line).toContain('"buildId":"1.0.1+2"');
    expect(line).toContain('"componentId":"cloudflare-turnstile-explicit"');
    expect(line).toContain('"bridgeVersion":1');
    expect(line).toContain('"pagePath":"/mobile/turnstile"');
    expect(line).toContain('"phase":"backend-reject"');
    expect(line).toContain('"requestId":"v1-login-0-abcdefgh"');
    expect(line).toContain('"httpStatus":403');
    expect(line).toContain('"durationMs":0');
    expect(line).not.toContain('secret-value');
    expect(line).not.toContain('token');
  });
});
