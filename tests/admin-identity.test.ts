import { describe, expect, it } from 'vitest';
import { formatAdminIdentity } from '@/src/lib/admin-identity';

describe('administrator identity display', () => {
  it('prefers a real username', () => {
    expect(formatAdminIdentity({ username: '  vex-admin  ', email: 'admin@example.com' })).toBe('vex-admin');
  });

  it('falls back to a real email when username is absent', () => {
    expect(formatAdminIdentity({ username: '   ', email: ' admin@example.com ' })).toBe('admin@example.com');
  });

  it('uses the role label when Admin Key sessions have no profile', () => {
    expect(formatAdminIdentity(null)).toBe('管理员');
    expect(formatAdminIdentity({ username: null, email: null })).toBe('管理员');
  });
});
