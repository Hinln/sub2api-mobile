import { updateAccessToken, sessionState, clearSession } from '@/src/auth/session';
import type { AuthResponse } from '@/src/types/auth';
import type { ApiEnvelope } from '@/src/types/admin';

const DEFAULT_TIMEOUT_MS = 15_000;
const RETRYABLE_STATUS = new Set([429, 502, 503]);
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const REFRESH_PATH = '/api/v1/auth/refresh';

export type AdminRequestOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
  idempotencyKey?: string;
  retry?: number;
  /** Internal flag used by the refresh request to prevent a refresh loop. */
  skipRefresh?: boolean;
};

export class ApiError extends Error {
  status: number;
  requestId?: string;
  code?: string;
  retryAfter?: number;
  isCloudflareChallenge: boolean;

  constructor(message: string, details: {
    status?: number;
    requestId?: string;
    code?: string;
    retryAfter?: number;
    isCloudflareChallenge?: boolean;
  } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = details.status ?? 0;
    this.requestId = details.requestId;
    this.code = details.code;
    this.retryAfter = details.retryAfter;
    this.isCloudflareChallenge = details.isCloudflareChallenge ?? false;
  }
}

let unauthorizedHandler: (() => void) | undefined;
let refreshInFlight: Promise<void> | undefined;

export function setUnauthorizedHandler(handler?: () => void) {
  unauthorizedHandler = handler;
}

export function buildRequestUrl(baseUrl: string, path: string) {
  const base = baseUrl.trim().replace(/\/+$/, '');
  if (!base) throw new Error('BASE_URL_REQUIRED');
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
    if (error instanceof Error && error.name === 'AbortError') return '请求已取消';
    if (error instanceof Error && error.message === 'REQUEST_TIMEOUT') return '请求超时，请检查网络后重试';
    return error instanceof Error ? error.message : '网络请求失败';
  }
  if (error.isCloudflareChallenge || error.code === 'CLOUDFLARE_CHALLENGE') {
    return '需要完成安全验证后才能继续，请在验证页面完成 Turnstile';
  }
  const map: Record<number, string> = {
    401: '登录状态已失效，请重新登录',
    403: '没有权限执行此操作',
    404: '请求的资源不存在',
    409: '数据已发生变化，请刷新后重试',
    422: '提交的数据不符合要求',
    429: '请求过于频繁，请稍后再试',
    500: '服务器内部错误',
    502: '上游服务暂时不可用',
    503: '服务器暂时不可用，请稍后再试',
  };
  return map[error.status] || error.message || '请求失败';
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

function isHtmlChallenge(raw: string, response: Response) {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  // Cloudflare can return a challenge marker with an otherwise empty or
  // non-HTML body. Check the documented response header before attempting to
  // parse the body as the Hub JSON envelope.
  const mitigated = response.headers.get('cf-mitigated')?.trim().toLowerCase();
  const trimmed = raw.trimStart().toLowerCase();
  return mitigated === 'challenge' || contentType.includes('text/html') || trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html');
}

function parsePayload<T>(raw: string): ApiEnvelope<T> | T | undefined {
  if (!raw) return undefined;
  try { return JSON.parse(raw) as ApiEnvelope<T> | T; } catch { return undefined; }
}

function isEnvelope<T>(value: ApiEnvelope<T> | T | undefined): value is ApiEnvelope<T> {
  return Boolean(value && typeof value === 'object' && ('code' in value || 'data' in value) &&
    (typeof (value as { code?: unknown }).code === 'number' || 'message' in value));
}

function payloadData<T>(payload: ApiEnvelope<T> | T | undefined) {
  if (isEnvelope(payload)) return payload.data as T;
  return payload as T;
}

function authPayload(value: unknown): AuthResponse & { access_token: string } {
  const candidate = isEnvelope(value) ? value.data : value;
  if (!candidate || typeof candidate !== 'object') throw new ApiError('刷新令牌响应无效', { code: 'INVALID_REFRESH_RESPONSE' });
  const item = candidate as Record<string, unknown>;
  const accessToken = typeof item.access_token === 'string' ? item.access_token :
    typeof item.accessToken === 'string' ? item.accessToken : '';
  if (!accessToken.trim()) throw new ApiError('刷新令牌响应缺少 access_token', { code: 'INVALID_REFRESH_RESPONSE' });
  return {
    ...item,
    access_token: accessToken,
    refresh_token: typeof item.refresh_token === 'string' ? item.refresh_token : undefined,
    expires_in: typeof item.expires_in === 'number' ? item.expires_in : undefined,
  } as AuthResponse & { access_token: string };
}

/** Refreshes at most once when several requests observe an expired access token. */
export async function refreshAccessToken(signal?: AbortSignal) {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = sessionState.refreshToken.trim();
  if (!refreshToken) throw new ApiError('缺少 refresh_token，请重新登录', { status: 401, code: 'REFRESH_TOKEN_REQUIRED' });

  refreshInFlight = (async () => {
    const result = await request<unknown>(REFRESH_PATH, {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    }, { signal, retry: 0, authenticated: false, skipRefresh: true });
    const token = authPayload(result);
    await updateAccessToken({
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: token.expires_in,
    });
  })().finally(() => { refreshInFlight = undefined; });
  return refreshInFlight;
}

type InternalOptions = AdminRequestOptions & { authenticated: boolean };

async function request<T>(path: string, init: RequestInit = {}, options: InternalOptions): Promise<T> {
  const baseUrl = sessionState.baseUrl.trim();
  if (!baseUrl) throw new Error('BASE_URL_REQUIRED');
  const method = (init.method || 'GET').toUpperCase();
  const maxRetries = IDEMPOTENT_METHODS.has(method) ? (options.retry ?? 2) : 0;
  let attempt = 0;
  let didRefresh = false;

  if (options.authenticated && !options.skipRefresh && sessionState.expiresAt > 0 &&
      Date.now() >= sessionState.expiresAt && sessionState.refreshToken) {
    try {
      await refreshAccessToken(options.signal);
    } catch (error) {
      await clearSession();
      unauthorizedHandler?.();
      throw error;
    }
  }

  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('timeout'), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const forwardAbort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', forwardAbort, { once: true });
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body && !(typeof FormData !== 'undefined' && init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    if (options.authenticated) {
      const accessToken = sessionState.accessToken.trim();
      if (!accessToken) throw new Error('ACCESS_TOKEN_REQUIRED');
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey);
    try {
      const response = await fetch(buildRequestUrl(baseUrl, path), { ...init, method, headers, signal: controller.signal });
      const requestId = response.headers.get('x-request-id') || response.headers.get('request-id') || undefined;
      const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
      const raw = await response.text();
      const challenge = isHtmlChallenge(raw, response);
      const payload = parsePayload<T>(raw);

      if (response.ok && !challenge) {
        // Empty 2xx responses are valid for delete/revoke endpoints, but a
        // non-empty body that is not JSON must never be treated as success.
        // Returning undefined here would let a screen render a false success
        // state after an upstream proxy or HTML error page.
        if (raw.trim() && payload === undefined) {
          throw new ApiError('服务器返回了无效响应', { status: 502, code: 'INVALID_JSON_RESPONSE', requestId });
        }
        if (!isEnvelope(payload) || payload.code === 0) return payloadData(payload);
      }

      const envelope = isEnvelope(payload) ? payload : undefined;
      const message = challenge ? 'Cloudflare security challenge required' :
        safeServerMessage(envelope?.reason) || safeServerMessage(envelope?.message) || `HTTP ${response.status}`;
      const apiError = new ApiError(message, {
        status: response.status,
        requestId,
        code: challenge ? 'CLOUDFLARE_CHALLENGE' : envelope ? String(envelope.code) : undefined,
        retryAfter,
        isCloudflareChallenge: challenge,
      });

      if (response.status === 401 && options.authenticated && !didRefresh && !options.skipRefresh && sessionState.refreshToken) {
        didRefresh = true;
        try {
          await refreshAccessToken(options.signal);
          continue;
        } catch {
          await clearSession();
          unauthorizedHandler?.();
          throw apiError;
        }
      }
      if (response.status === 401 && options.authenticated) unauthorizedHandler?.();
      if (attempt < maxRetries && RETRYABLE_STATUS.has(response.status) && !challenge) {
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

/** Authenticated Hub API request. Uses JWT Bearer tokens and one-flight refresh. */
export function adminFetch<T>(path: string, init: RequestInit = {}, options: AdminRequestOptions = {}) {
  return request<T>(path, init, { ...options, authenticated: true });
}

/** Public Hub API request used by login, registration and public settings. */
export function publicFetch<T>(path: string, init: RequestInit = {}, options: AdminRequestOptions = {}) {
  return request<T>(path, init, { ...options, authenticated: false, skipRefresh: true });
}
