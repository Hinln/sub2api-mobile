import { describe, expect, it } from 'vitest';

import { formatOptionalMoney, formatOptionalNumber, formatOptionalTokenValue } from '@/src/lib/formatters';

describe('optional server metric formatting', () => {
  it('keeps missing values visibly distinct from a real zero', () => {
    expect(formatOptionalNumber(undefined)).toBe('--');
    expect(formatOptionalNumber(null)).toBe('--');
    expect(formatOptionalNumber(0)).toBe('0');
    expect(formatOptionalMoney(undefined)).toBe('--');
    expect(formatOptionalMoney(0)).toBe('$0.0000');
    expect(formatOptionalTokenValue(undefined)).toBe('--');
    expect(formatOptionalTokenValue(0)).toBe('0');
  });
});
