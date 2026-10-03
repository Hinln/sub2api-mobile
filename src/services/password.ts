import { publicFetch } from '@/src/lib/admin-fetch';

/** Public password recovery endpoints. Tokens are supplied only in the reset
 * deep link and are never persisted by the app. */
export function requestPasswordReset(input: { email: string; turnstile_token?: string }) {
  return publicFetch<{ message: string }>('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function resetPassword(input: { email: string; token: string; new_password: string }) {
  return publicFetch<{ message: string }>('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
