import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import { isDefaultHubUrl, normalizeHubUrl, VEXLUNE_API_URL, VEXLUNE_HUB_URL } from '@/src/config/vexlune';
import { formatMoney, mapStatus } from '@/src/lib/admin-utils';
import { formatCompactNumber, formatTokenValue } from '@/src/lib/formatters';
import { buildQuery } from '@/src/services/admin';

describe('Vexlune domain boundary', () => {
  it('accepts the default HTTPS Hub root', () => expect(normalizeHubUrl(`${VEXLUNE_HUB_URL}/`)).toBe(VEXLUNE_HUB_URL));
  it('rejects the model API as an admin address', () => expect(() => normalizeHubUrl(VEXLUNE_API_URL)).toThrow(/API/));
  it('rejects HTTP and embedded credentials', () => {
    expect(() => normalizeHubUrl('http://hub.example.com')).toThrow();
    expect(() => normalizeHubUrl('https://user:pass@hub.example.com')).toThrow();
  });
  it('rejects paths, queries and hashes', () => {
    expect(() => normalizeHubUrl('https://hub.example.com/admin')).toThrow();
    expect(() => normalizeHubUrl('https://hub.example.com?q=1')).toThrow();
  });
  it('recognizes only the default Hub URL', () => {
    expect(isDefaultHubUrl(VEXLUNE_HUB_URL)).toBe(true);
    expect(isDefaultHubUrl('https://other.example.com')).toBe(false);
  });
});

describe('formatters and pagination', () => {
  it('formats money and token quantities', () => {
    expect(formatMoney(12.3)).toBe('$12.30');
    expect(formatMoney(Number.NaN)).toBe('--');
    expect(formatTokenValue(1_500)).toBe('1.5K');
    expect(formatCompactNumber(2_000_000)).toBe('2M');
  });
  it('maps operational statuses', () => {
    expect(mapStatus('active').tone).toBe('success');
    expect(mapStatus('rate_limited').tone).toBe('warning');
    expect(mapStatus('error').tone).toBe('danger');
  });
  it('omits empty pagination parameters and encodes values', () => {
    expect(buildQuery({ page: 2, page_size: 30, search: 'a b', status: undefined })).toBe('?page=2&page_size=30&search=a+b');
  });
});

describe('dashboard billing semantics', () => {
  it('keeps explicit actual billing and official price fields separate in the contract', () => {
    const stats = { today_actual_cost: 1.08, today_standard_cost: 5.29 };
    expect(stats.today_actual_cost).not.toBe(stats.today_standard_cost);
  });
});
