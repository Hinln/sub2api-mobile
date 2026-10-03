/**
 * Creates an operation key for one user-confirmed write. Callers keep the
 * returned value in a ref/state slot and reuse it when retrying that same
 * operation. A new user confirmation must create a new key, especially for
 * additive balance operations.
 */
export function newIdempotencyKey(scope: string) {
  const normalized = scope.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 48) || 'write';
  const uuid = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `mobile-${normalized}-${uuid}`;
}
