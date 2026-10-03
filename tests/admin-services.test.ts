import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listAccounts, listUsageLogs, listUsers } from '@/src/services/admin';
import { listAlertEvents } from '@/src/services/admin-extended';
import { adminConfigState } from '@/src/store/admin-config';

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

function response(data: unknown) {
  return new Response(JSON.stringify({ code: 0, message: 'ok', data }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const page = { items: [], total: 0, page: 1, page_size: 20, pages: 0 };

describe('admin service query contracts', () => {
  beforeEach(() => {
    adminConfigState.baseUrl = 'https://hub.vexlune.com';
    adminConfigState.accessToken = 'test-token';
  });

  afterEach(() => vi.restoreAllMocks());

  it('uses backend sort_by/sort_order names for users', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(page));
    await listUsers('', { page: 2, page_size: 10, sort: 'created_at', order: 'asc' });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/v1/admin/users?page=2&page_size=10&sort_by=created_at&sort_order=asc');
  });

  it('uses backend sort_by/sort_order names for accounts', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(page));
    await listAccounts('', { sort: 'name', order: 'desc' });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/v1/admin/accounts?page=1&page_size=50&sort_by=name&sort_order=desc');
  });

  it('sends the real usage search and sort contract', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(page));
    await listUsageLogs({ search: 'gpt-5', sort: 'model', order: 'asc' });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/v1/admin/usage?page=1&page_size=30&search=gpt-5&sort_by=model&sort_order=asc');
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('status=');
  });

  it('uses the official alert event limit contract and accepts a bare array', async () => {
    const events = [{ id: 7, description: '上游错误率过高', fired_at: '2026-10-03T01:02:03Z', status: 'firing' }];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(events), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));

    await expect(listAlertEvents({ limit: 50, status: 'firing' })).resolves.toEqual(events);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/v1/admin/ops/alert-events?limit=50&status=firing');
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('page_size=');
  });
});
