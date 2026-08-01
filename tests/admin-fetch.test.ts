import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import { adminFetch, ApiError, buildRequestUrl, humanizeApiError, redactSecret, setUnauthorizedHandler } from '@/src/lib/admin-fetch';
import { adminConfigState } from '@/src/store/admin-config';

function response(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });
}

describe('adminFetch', () => {
  beforeEach(() => {
    adminConfigState.baseUrl = 'https://hub.vexlune.com';
    adminConfigState.adminApiKey = 'admin-test-secret';
    vi.restoreAllMocks();
  });
  afterEach(() => setUnauthorizedHandler(undefined));

  it('builds a Hub request and returns envelope data', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ code: 0, message: 'ok', data: { ok: true } }));
    await expect(adminFetch<{ ok: boolean }>('/api/v1/admin/settings')).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://hub.vexlune.com/api/v1/admin/settings');
    expect(new Headers(init?.headers).get('x-api-key')).toBe('admin-test-secret');
  });

  it('reads request id and status from JSON errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ code: 1, message: 'forbidden' }, 403, { 'x-request-id': 'req-1' }));
    const error = await adminFetch<never>('/api/v1/admin/settings').catch((value) => value as ApiError) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(403);
    expect(error.requestId).toBe('req-1');
    expect(humanizeApiError(error)).toMatch(/\u6743\u9650/);
  });

  it('handles non-JSON server errors safely', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response('<html>bad gateway</html>', 502));
    const error = await adminFetch<never>('/api/v1/admin/settings', {}, { retry: 0 }).catch((value) => value as ApiError) as ApiError;
    expect(error.status).toBe(502);
    expect(error.message).toBe('HTTP 502');
  });

  it('notifies on 401', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ code: 1, message: 'no' }, 401));
    await expect(adminFetch('/api/v1/admin/settings')).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('retries transient GET failures', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ code: 1, message: 'busy' }, 503))
      .mockResolvedValueOnce(response({ code: 0, message: 'ok', data: [] }));
    await expect(adminFetch('/api/v1/admin/users', {}, { retry: 1 })).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never retries non-idempotent writes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ code: 1, message: 'busy' }, 503));
    await expect(adminFetch('/api/v1/admin/users', { method: 'POST', body: '{}' }, { retry: 3 })).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('supports cancellation and missing credential errors', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    await expect(adminFetch('/api/v1/admin/settings', {}, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    adminConfigState.adminApiKey = '';
    await expect(adminFetch('/api/v1/admin/settings')).rejects.toThrow('ADMIN_API_KEY_REQUIRED');
  });
});

describe('client helpers', () => {
  it('joins paths without changing the base host', () => expect(buildRequestUrl('https://hub.vexlune.com/', 'api/v1/admin/users')).toBe('https://hub.vexlune.com/api/v1/admin/users'));
  it('masks secrets', () => {
    expect(redactSecret('admin-1234567890')).toBe('admi...7890');
    expect(redactSecret('short')).toBe('s***');
  });
});
