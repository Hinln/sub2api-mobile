import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import { AuthApiError, login } from '@/src/services/auth';
import { sessionState } from '@/src/auth/session';

describe('public auth transport', () => {
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
});
