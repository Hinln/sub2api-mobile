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
    adminConfigState.accessToken = 'access-test-token';
    adminConfigState.adminApiKey = '';
    adminConfigState.refreshToken = '';
    vi.restoreAllMocks();
  });
  afterEach(() => setUnauthorizedHandler(undefined));

  it('builds a Hub request and returns envelope data', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ code: 0, message: 'ok', data: { ok: true } }));
    await expect(adminFetch<{ ok: boolean }>('/api/v1/admin/settings')).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://hub.vexlune.com/api/v1/admin/settings');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer access-test-token');
  });

  it('uses the official x-api-key header when an Admin API Key is present', async () => {
    adminConfigState.adminApiKey = 'admin-test-key';
    adminConfigState.accessToken = 'stale-bearer-token';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ code: 0, data: { ok: true } }));

    await expect(adminFetch<{ ok: boolean }>('/api/v1/admin/settings', {
      headers: { Authorization: 'Bearer inherited-token' },
    })).resolves.toEqual({ ok: true });
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get('x-api-key')).toBe('admin-test-key');
    expect(headers.get('authorization')).toBeNull();
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
    expect(error.message).toBe('Cloudflare security challenge required');
  });

  it('rejects non-empty invalid JSON on a successful response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response('upstream text', 200, { 'content-type': 'text/plain' }));
    await expect(adminFetch('/api/v1/admin/settings', {}, { retry: 0 })).rejects.toMatchObject({
      status: 502,
      code: 'INVALID_JSON_RESPONSE',
    });
  });

  it('classifies Cloudflare challenge responses by cf-mitigated header', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response('', 403, { 'cf-mitigated': 'challenge' }));
    const error = await adminFetch<never>('/api/v1/admin/settings', {}, { retry: 0 }).catch((value) => value as ApiError) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(403);
    expect(error.isCloudflareChallenge).toBe(true);
    expect(error.code).toBe('CLOUDFLARE_CHALLENGE');
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
    adminConfigState.accessToken = '';
    await expect(adminFetch('/api/v1/admin/settings')).rejects.toThrow('ACCESS_TOKEN_REQUIRED');
  });

  it('falls back to the equivalent trailing-dot origin after a proxy TLS failure', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(response({ code: 0, data: { ok: true } }));

    await expect(adminFetch<{ ok: boolean }>('/api/v1/admin/settings', {}, { retry: 0 })).resolves.toEqual({ ok: true });
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://hub.vexlune.com/api/v1/admin/settings');
    expect(String(fetchMock.mock.calls[1][0])).toBe('https://hub.vexlune.com./api/v1/admin/settings');
  });
});

describe('client helpers', () => {
  it('joins paths without changing the base host', () => expect(buildRequestUrl('https://hub.vexlune.com/', 'api/v1/admin/users')).toBe('https://hub.vexlune.com/api/v1/admin/users'));
  it('masks secrets', () => {
    expect(redactSecret('admin-1234567890')).toBe('admi...7890');
    expect(redactSecret('short')).toBe('s***');
  });
});
