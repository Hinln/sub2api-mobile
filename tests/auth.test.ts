import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import { AuthApiError, getPublicSettings, login, logoutRemote } from '@/src/services/auth';
import { clearSession, saveSession, sessionState, setWorkspaceMode } from '@/src/auth/session';

afterEach(async () => {
  await clearSession();
  vi.restoreAllMocks();
});

describe('public auth transport', () => {
  it('reads registration_enabled from the public settings contract', async () => {
    sessionState.baseUrl = 'https://hub.vexlune.com';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ code: 0, data: {
      registration_enabled: false,
      email_verify_enabled: true,
    } }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const settings = await getPublicSettings();

    expect(settings.registration_enabled).toBe(false);
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBeNull();
  });

  it('classifies Cloudflare challenge responses by cf-mitigated header', async () => {
    sessionState.baseUrl = 'https://hub.vexlune.com';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', {
      status: 403,
      headers: { 'cf-mitigated': 'challenge' },
    }));

    const error = await login({ email: 'person@example.com', password: 'password' }).catch((value) => value as AuthApiError);
    expect(error).toBeInstanceOf(AuthApiError);
    expect(error.challenge).toBe(true);
    expect(error.status).toBe(403);
  });

  it('refreshes the role from auth/me after login', async () => {
    sessionState.baseUrl = 'https://hub.vexlune.com';
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, data: {
        access_token: 'access-token', refresh_token: 'refresh-token', expires_in: 3600,
        user: { id: 7, email: 'person@example.com', role: 'user' },
      } }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, data: {
        id: 7, email: 'person@example.com', role: 'administrator', status: 'active',
      } }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await login({ email: 'person@example.com', password: 'password' });

    expect(result.user?.role).toBe('administrator');
    expect(sessionState.workspaceMode).toBe('admin');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/v1/auth/me');
    const headers = new Headers((fetchMock.mock.calls[1][1] as RequestInit).headers);
    expect(headers.get('Authorization')).toBe('Bearer access-token');
  });

  it('accepts the password step response that requires TOTP before issuing a token', async () => {
    sessionState.baseUrl = 'https://hub.vexlune.com';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ code: 0, data: {
      requires_2fa: true,
      temp_token: 'temporary-login-token',
      user_email_masked: 'p***@example.com',
    } }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await login({ email: 'person@example.com', password: 'password' });

    expect(result.requires_2fa).toBe(true);
    expect(result.temp_token).toBe('temporary-login-token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sessionState.accessToken).toBe('');
  });

  it('always calls the public logout endpoint and sends the refresh token when available', async () => {
    sessionState.baseUrl = 'https://hub.vexlune.com';
    sessionState.refreshToken = 'refresh-token';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ code: 0, data: { message: 'Logged out successfully' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));

    await logoutRemote();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/auth/logout');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ refresh_token: 'refresh-token' });
    expect(new Headers(init.headers).get('Authorization')).toBeNull();
  });

  it('calls logout even when no refresh token remains locally', async () => {
    sessionState.baseUrl = 'https://hub.vexlune.com';
    sessionState.refreshToken = '';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ code: 0, data: { message: 'Logged out successfully' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));

    await logoutRemote();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({});
  });

  it('switches an administrator between their own workspaces without changing identity', async () => {
    await saveSession({ accessToken: 'admin-token', user: { id: 9, email: 'admin@example.com', role: 'administrator' } });
    setWorkspaceMode('user');
    expect(sessionState.workspaceMode).toBe('user');
    expect(sessionState.user?.id).toBe(9);
    setWorkspaceMode('admin');
    expect(sessionState.workspaceMode).toBe('admin');
  });

  it('does not let a regular user enter the administrator workspace', async () => {
    await saveSession({ accessToken: 'user-token', user: { id: 10, email: 'user@example.com', role: 'user' } });
    expect(() => setWorkspaceMode('admin')).toThrow('ADMIN_WORKSPACE_REQUIRED');
    expect(sessionState.workspaceMode).toBe('user');
  });
});
