import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import {
  changeUserPassword,
  disableTotp,
  enableTotp,
  getTotpStatus,
  initiateTotpSetup,
  sendTotpVerifyCode,
  updateUserProfile,
} from '@/src/services/user';
import { clearSession, sessionState } from '@/src/auth/session';

function ok(data: unknown) {
  return new Response(JSON.stringify({ code: 0, message: 'ok', data }), { status: 200, headers: { 'content-type': 'application/json' } });
}

afterEach(async () => {
  await clearSession();
  vi.restoreAllMocks();
});

describe('user security service contracts', () => {
  it('updates the profile and changes password through the user routes', async () => {
    sessionState.baseUrl = 'https://hub.vexlune.com';
    sessionState.accessToken = 'access-token';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(ok({ id: 7, email: 'person@example.com', username: 'new-name' })).mockResolvedValueOnce(ok({ message: 'Password changed successfully' }));

    await updateUserProfile({ username: 'new-name' });
    await changeUserPassword('old-password', 'new-password');

    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/user');
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('PUT');
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({ username: 'new-name' });
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/v1/user/password');
    expect(JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body))).toEqual({ old_password: 'old-password', new_password: 'new-password' });
  });

  it('uses the server TOTP setup, enable and disable contracts', async () => {
    sessionState.baseUrl = 'https://hub.vexlune.com';
    sessionState.accessToken = 'access-token';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(ok({ enabled: false, feature_enabled: true })).mockResolvedValueOnce(ok({ success: true })).mockResolvedValueOnce(ok({ secret: 'secret', qr_code_url: 'otpauth://totp/example', setup_token: 'setup', countdown: 300 })).mockResolvedValueOnce(ok({ success: true })).mockResolvedValueOnce(ok({ success: true }));

    await getTotpStatus();
    await sendTotpVerifyCode();
    const setup = await initiateTotpSetup({ password: 'password' });
    await enableTotp({ totp_code: '123456', setup_token: setup.setup_token });
    await disableTotp({ password: 'password' });

    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/user/totp/status');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/v1/user/totp/send-code');
    expect(String(fetchMock.mock.calls[2][0])).toContain('/api/v1/user/totp/setup');
    expect(String(fetchMock.mock.calls[3][0])).toContain('/api/v1/user/totp/enable');
    expect(String(fetchMock.mock.calls[4][0])).toContain('/api/v1/user/totp/disable');
    expect(JSON.parse(String((fetchMock.mock.calls[3][1] as RequestInit).body))).toEqual({ totp_code: '123456', setup_token: 'setup' });
  });
});
