import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import { acceptAdminCompliance, getAdminComplianceStatus, validateAdminApiKey } from '@/src/services/admin-auth';
import { clearSession, sessionState } from '@/src/auth/session';
import { humanizeApiError } from '@/src/lib/admin-fetch';

afterEach(async () => {
  await clearSession();
  vi.restoreAllMocks();
});

describe('Admin API Key authentication', () => {
  it('validates against the official admin key status endpoint and persists the key', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      code: 0,
      data: { exists: true, masked_key: 'admin-••••1234' },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    await expect(validateAdminApiKey('  admin-real-key  ')).resolves.toEqual({ exists: true, masked_key: 'admin-••••1234' });
    expect(sessionState.adminApiKey).toBe('admin-real-key');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/admin/settings/admin-api-key');
    expect(headers.get('x-api-key')).toBe('admin-real-key');
    expect(headers.get('authorization')).toBeNull();
  });

  it('does not persist a rejected key', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      code: 401,
      reason: 'INVALID_ADMIN_KEY',
      message: 'Invalid admin API key',
    }), { status: 401, headers: { 'content-type': 'application/json' } }));

    const error = await validateAdminApiKey('admin-invalid-key').catch((value) => value as Error & { status?: number; code?: string });
    expect(error).toMatchObject({ status: 401, code: 'INVALID_ADMIN_KEY' });
    expect(humanizeApiError(error)).toContain('无效');
    expect(sessionState.adminApiKey).toBe('');
  });

  it('keeps compliance requests on the official key header and sends the explicit phrase', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('x-api-key')).toBe('admin-compliance-key');
      expect(headers.get('authorization')).toBeNull();
      if (init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({ phrase: '已阅读并同意', language: 'zh' });
      }
      return new Response(JSON.stringify({ code: 0, data: { required: true, version: 'v2026.06.10' } }), { status: 200, headers: { 'content-type': 'application/json' } });
    });

    await expect(getAdminComplianceStatus('admin-compliance-key')).resolves.toMatchObject({ required: true });
    await expect(acceptAdminCompliance('admin-compliance-key', '已阅读并同意')).resolves.toMatchObject({ version: 'v2026.06.10' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
