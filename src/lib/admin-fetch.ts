import { adminConfigState } from '@/src/store/admin-config';
import type { ApiEnvelope } from '@/src/types/admin';

const DEFAULT_TIMEOUT_MS = 15_000;
const RETRYABLE_STATUS = new Set([429, 502, 503]);
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD']);

export type AdminRequestOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
  idempotencyKey?: string;
  retry?: number;
};

export class ApiError extends Error {
  status: number;
  requestId?: string;
  code?: string;
  retryAfter?: number;

  constructor(message: string, details: { status?: number; requestId?: string; code?: string; retryAfter?: number } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = details.status ?? 0;
    this.requestId = details.requestId;
    this.code = details.code;
    this.retryAfter = details.retryAfter;
  }
}

let unauthorizedHandler: (() => void) | undefined;

export function setUnauthorizedHandler(handler?: () => void) {
  unauthorizedHandler = handler;
}

export function buildRequestUrl(baseUrl: string, path: string) {
  const base = baseUrl.trim().replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export function redactSecret(value: string, visible = 4) {
  if (!value) return '';
  if (value.length <= visible * 2) return `${value.slice(0, 1)}***`;
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

export function humanizeApiError(error: unknown) {
  if (!(error instanceof ApiError)) {
    if (error instanceof Error && error.name === 'AbortError') return '\u8bf7\u6c42\u5df2\u53d6\u6d88';
    if (error instanceof Error && error.message === 'REQUEST_TIMEOUT') return '\u8bf7\u6c42\u8d85\u65f6\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u540e\u91cd\u8bd5';
    if (error instanceof TypeError || (error instanceof Error && /failed to fetch|network request failed|load failed/i.test(error.message))) {
      return '\u65e0\u6cd5\u8fde\u63a5 Hub\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u3001HTTPS \u8bc1\u4e66\u6216\u7ba1\u7406\u5730\u5740';
    }
    return error instanceof Error ? error.message : '\u7f51\u7edc\u8bf7\u6c42\u5931\u8d25';
  }

  const map: Record<number, string> = {
    401: '\u767b\u5f55\u72b6\u6001\u5df2\u5931\u6548\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55',
    403: '\u6ca1\u6709\u6743\u9650\u6267\u884c\u6b64\u64cd\u4f5c',
    404: '\u8bf7\u6c42\u7684\u8d44\u6e90\u4e0d\u5b58\u5728',
    409: '\u6570\u636e\u5df2\u53d1\u751f\u53d8\u5316\uff0c\u8bf7\u5237\u65b0\u540e\u91cd\u8bd5',
    422: '\u63d0\u4ea4\u7684\u6570\u636e\u4e0d\u7b26\u5408\u8981\u6c42',
    429: '\u8bf7\u6c42\u8fc7\u4e8e\u9891\u7e41\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5',
    500: '\u670d\u52a1\u5668\u5185\u90e8\u9519\u8bef',
    502: '\u4e0a\u6e38\u670d\u52a1\u6682\u65f6\u4e0d\u53ef\u7528',
    503: '\u670d\u52a1\u5668\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5',
  };
  return map[error.status] || error.message || '\u8bf7\u6c42\u5931\u8d25';
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

function parseRetryAfter(value: string | null) {
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : undefined;
}

function safeServerMessage(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const clean = value.replace(/(?:admin-|sk-)[A-Za-z0-9._-]+/gi, '[REDACTED]').slice(0, 240);
  return clean || undefined;
}

export async function adminFetch<T>(path: string, init: RequestInit = {}, options: AdminRequestOptions = {}): Promise<T> {
  const baseUrl = adminConfigState.baseUrl.trim();
  const adminApiKey = adminConfigState.adminApiKey.trim();
  if (!baseUrl) throw new Error('BASE_URL_REQUIRED');
  if (!adminApiKey) throw new Error('ADMIN_API_KEY_REQUIRED');

  const method = (init.method || 'GET').toUpperCase();
  const maxRetries = IDEMPOTENT_METHODS.has(method) ? (options.retry ?? 2) : 0;
  let attempt = 0;

  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('timeout'), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const forwardAbort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', forwardAbort, { once: true });
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body) headers.set('Content-Type', 'application/json');
    headers.set('x-api-key', adminApiKey);
    if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey);

    try {
      const response = await fetch(buildRequestUrl(baseUrl, path), { ...init, method, headers, signal: controller.signal });
      const requestId = response.headers.get('x-request-id') || response.headers.get('request-id') || undefined;
      const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
      const raw = await response.text();
      let payload: ApiEnvelope<T> | undefined;
      try {
        payload = raw ? JSON.parse(raw) as ApiEnvelope<T> : undefined;
      } catch {
        payload = undefined;
      }

      if (response.ok && (!payload || payload.code === 0)) {
        return (payload ? payload.data : undefined) as T;
      }

      const message = safeServerMessage(payload?.reason) || safeServerMessage(payload?.message) || `HTTP ${response.status}`;
      const apiError = new ApiError(message, {
        status: response.status,
        requestId,
        code: payload ? String(payload.code) : undefined,
        retryAfter,
      });
      if (response.status === 401) unauthorizedHandler?.();
      if (attempt < maxRetries && RETRYABLE_STATUS.has(response.status)) {
        attempt += 1;
        await sleep(Math.min(retryAfter ?? 350 * 2 ** attempt, 2_500), options.signal);
        continue;
      }
      throw apiError;
    } catch (error) {
      if (controller.signal.aborted && !options.signal?.aborted) throw new Error('REQUEST_TIMEOUT');
      if (attempt < maxRetries && error instanceof TypeError) {
        attempt += 1;
        await sleep(350 * 2 ** attempt, options.signal);
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', forwardAbort);
    }
  }
}
