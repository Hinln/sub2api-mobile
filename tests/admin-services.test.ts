import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listAccounts, listUsageLogs, listUsers } from '@/src/services/admin';
import { getOpsDashboardOverview, listAdminPaymentOrders, listAlertEvents, queryAdminPaymentRefund } from '@/src/services/admin-extended';
import { getRefundEligibleProviders, requestPaymentRefund } from '@/src/services/user';
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

  it('supports the official active-admin identity query', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(page));
    await listUsers('', { page: 1, page_size: 1, status: 'active', role: 'admin', sort: 'id', order: 'asc' });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/v1/admin/users?page=1&page_size=1&status=active&role=admin&sort_by=id&sort_order=asc');
  });

  it('uses the official operations overview query contract', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({
      health_score: 97,
      qps: { current: 0.1, peak: 0.3, avg: 0.1 },
      tps: { current: 12, peak: 18, avg: 12 },
      sla: 100,
      error_rate: 0,
      duration: { p99_ms: 420 },
    }));

    await expect(getOpsDashboardOverview()).resolves.toMatchObject({ health_score: 97 });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/v1/admin/ops/dashboard/overview?time_range=1h&mode=auto');
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

  it('uses keyword for the official admin payment order search filter', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(page));
    await listAdminPaymentOrders({ page: 2, page_size: 10, search: 'user@example.com' });
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain('/api/v1/admin/payment/orders?page=2&page_size=10&keyword=user%40example.com');
    expect(url).not.toContain('search=');
  });

  it('uses the official refund status query route', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ success: true }));
    await queryAdminPaymentRefund(42, 'refund-query-key');
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain('/api/v1/admin/payment/orders/42/refund/query');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('uses the official user refund eligibility and request routes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response({ provider_instance_ids: ['provider-1'] })).mockResolvedValueOnce(response({ message: 'refund requested' }));
    await expect(getRefundEligibleProviders()).resolves.toEqual({ provider_instance_ids: ['provider-1'] });
    await requestPaymentRefund(42, '用户在移动端提交退款申请', 'refund-request-key');
    const [eligibilityUrl, requestUrl] = fetchMock.mock.calls;
    expect(String(eligibilityUrl?.[0])).toContain('/api/v1/payment/orders/refund-eligible-providers');
    expect(String(requestUrl?.[0])).toContain('/api/v1/payment/orders/42/refund-request');
    expect((requestUrl?.[1] as RequestInit).method).toBe('POST');
    expect(JSON.parse(String((requestUrl?.[1] as RequestInit).body))).toEqual({ reason: '用户在移动端提交退款申请' });
    expect(new Headers((requestUrl?.[1] as RequestInit).headers).get('Idempotency-Key')).toBe('refund-request-key');
  });
});
