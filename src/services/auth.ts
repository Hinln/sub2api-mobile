import { normalizeHubUrl } from '@/src/config/vexlune';
import { clearSession, sessionState, saveSession, updateAccessToken, updateSessionUser } from '@/src/auth/session';
import { userSchema, publicSettingsSchema, authResponseSchema, type AuthResponse, type AuthUser, type PublicSettings } from '@/src/types/auth';

type ApiEnvelope<T> = { code?: number; message?: string; reason?: string; data?: T } & Record<string, unknown>;

export class AuthApiError extends Error {
  readonly status: number;
  readonly code?: number;
  readonly requestId?: string;
  readonly challenge: boolean;

  constructor(message: string, status: number, options: { code?: number; requestId?: string; challenge?: boolean } = {}) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.challenge = Boolean(options.challenge);
  }
}

function urlFor(path: string) {
  const base = normalizeHubUrl(sessionState.baseUrl);
  return `${base}/${path.replace(/^\/+/, '')}`;
}

function isHtmlResponse(response: Response, body: string) {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const mitigated = response.headers.get('cf-mitigated')?.trim().toLowerCase();
  return mitigated === 'challenge' || contentType.includes('text/html') || /^\s*<(?:!doctype\s+html|html|head|body)\b/i.test(body);
}

async function request<T>(path: string, init: RequestInit = {}, options: { auth?: boolean } = {}) {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (options.auth !== false && sessionState.accessToken) headers.set('Authorization', `Bearer ${sessionState.accessToken}`);

  let response: Response;
  try {
    response = await fetch(urlFor(path), { ...init, headers });
  } catch (error) {
    throw new AuthApiError(error instanceof Error ? error.message : '网络连接失败', 0);
  }

  const text = await response.text();
  if (isHtmlResponse(response, text)) {
    throw new AuthApiError('Cloudflare 正在验证当前请求，请完成浏览器挑战后重试。', response.status, { challenge: true });
  }

  let payload: ApiEnvelope<T> | T | null = null;
  if (text.trim()) {
    try { payload = JSON.parse(text) as ApiEnvelope<T> | T; } catch { payload = null; }
  }
  const envelope = payload && typeof payload === 'object' && ('data' in payload || 'code' in payload || 'message' in payload) ? payload as ApiEnvelope<T> : undefined;
  if (!response.ok || (typeof envelope?.code === 'number' && envelope.code !== 0)) {
    const message = typeof envelope?.message === 'string' ? envelope.message : `HTTP ${response.status}`;
    throw new AuthApiError(message, response.status, { code: envelope?.code, requestId: response.headers.get('x-request-id') ?? undefined });
  }
  return (envelope && 'data' in envelope ? envelope.data : payload) as T;
}

function parseUser(value: unknown): AuthUser {
  const parsed = userSchema.safeParse(value);
  if (!parsed.success) throw new AuthApiError('服务器返回的用户信息无效', 502);
  return parsed.data;
}

function parseAuthResponse(value: unknown): AuthResponse {
  const parsed = authResponseSchema.safeParse(value);
  if (!parsed.success) throw new AuthApiError('服务器返回的登录凭据无效', 502);
  return parsed.data;
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const value = await request<unknown>('/api/v1/settings/public', {}, { auth: false });
  const parsed = publicSettingsSchema.safeParse(value);
  if (!parsed.success) throw new AuthApiError('服务器返回的公开设置无效', 502);
  return parsed.data;
}

export async function login(input: { email: string; password: string; turnstile_token?: string; turnstile_nonce?: string }) {
  const response = parseAuthResponse(await request<unknown>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(input) }, { auth: false }));
  if (response.requires_2fa) return response;
  if (!response.access_token || !response.user) throw new AuthApiError('登录响应缺少会话信息', 502);
  await saveSession({ accessToken: response.access_token, refreshToken: response.refresh_token, expiresIn: response.expires_in, user: parseUser(response.user) });
  try {
    const user = await getCurrentUser();
    return { ...response, user };
  } catch (error) {
    await clearSession();
    throw error;
  }
}

export async function completeTwoFactor(tempToken: string, totpCode: string) {
  const response = parseAuthResponse(await request<unknown>('/api/v1/auth/login/2fa', { method: 'POST', body: JSON.stringify({ temp_token: tempToken, totp_code: totpCode }) }, { auth: false }));
  if (!response.access_token || !response.user) throw new AuthApiError('二次验证响应缺少会话信息', 502);
  await saveSession({ accessToken: response.access_token, refreshToken: response.refresh_token, expiresIn: response.expires_in, user: parseUser(response.user) });
  try {
    const user = await getCurrentUser();
    return { ...response, user };
  } catch (error) {
    await clearSession();
    throw error;
  }
}

export async function register(input: { email: string; password: string; verify_code?: string; turnstile_token?: string; turnstile_nonce?: string }) {
  const response = parseAuthResponse(await request<unknown>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(input) }, { auth: false }));
  if (!response.access_token || !response.user) throw new AuthApiError('注册响应缺少会话信息', 502);
  await saveSession({ accessToken: response.access_token, refreshToken: response.refresh_token, expiresIn: response.expires_in, user: parseUser(response.user) });
  try {
    const user = await getCurrentUser();
    return { ...response, user };
  } catch (error) {
    await clearSession();
    throw error;
  }
}

export async function sendVerifyCode(input: { email: string; turnstile_token?: string; turnstile_nonce?: string }) {
  return request<{ message: string; countdown: number }>('/api/v1/auth/send-verify-code', { method: 'POST', body: JSON.stringify(input) }, { auth: false });
}

export async function getCurrentUser() {
  const value = await request<unknown>('/api/v1/auth/me');
  const user = parseUser(value);
  await updateSessionUser(user);
  return user;
}

let refreshPromise: Promise<boolean> | null = null;
export async function refreshSession() {
  if (!sessionState.refreshToken) return false;
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const value = await request<unknown>('/api/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token: sessionState.refreshToken }) }, { auth: false });
      const response = value as { access_token?: string; refresh_token?: string; expires_in?: number };
      if (!response.access_token) return false;
      await updateAccessToken({ accessToken: response.access_token, refreshToken: response.refresh_token, expiresIn: response.expires_in });
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function logoutRemote() {
  // The logout route is intentionally public and accepts an optional refresh
  // token. Always call it while a session is being signed out so admin and
  // user workspaces revoke the server session even when the local token was
  // already removed or expired. The caller still clears local credentials in
  // a finally block when the network is unavailable.
  await request('/api/v1/auth/logout', {
    method: 'POST',
    body: JSON.stringify(sessionState.refreshToken ? { refresh_token: sessionState.refreshToken } : {}),
  }, { auth: false });
}
