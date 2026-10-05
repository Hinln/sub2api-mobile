import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { normalizeHubUrl, VEXLUNE_HUB_URL } from '@/src/config/vexlune';
import type { AuthUser } from '@/src/types/auth';

const ACCESS_TOKEN_KEY = 'vexlune_access_token_v2';
const REFRESH_TOKEN_KEY = 'vexlune_refresh_token_v2';
const EXPIRES_AT_KEY = 'vexlune_expires_at_v2';
const USER_KEY = 'vexlune_user_v2';
const BIOMETRIC_KEY = 'vexlune_biometric_lock_v2';
const BASE_URL_KEY = 'vexlune_hub_url_v2';
/**
 * The official Sub2API admin middleware accepts this credential in the
 * `x-api-key` header. Keep it in the device keychain only; it must never be
 * copied into AsyncStorage, logs, or a URL.
 */
export const ADMIN_API_KEY_KEY = 'vexlune_admin_api_key_v2';
const IS_WEB = Platform.OS === 'web';

// Keep this store deliberately small. Server data and permissions live in Query;
// this object only holds session material and local preferences.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { proxy } = require('valtio');
const createProxy = proxy as <T extends object>(value: T) => T;

export type SessionState = {
  baseUrl: string;
  /** Compatibility display field; true when a custom Hub URL is configured. */
  advancedUrlEnabled: boolean;
  /** Compatibility display field for the old settings screen. */
  saving: boolean;
  /** Official Sub2API administrator credential sent as `x-api-key`. */
  adminApiKey: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser | null;
  /**
   * Which first-party workspace the current administrator is viewing. This is
   * intentionally local UI state: the access token always remains the
   * administrator's own token, so switching to the user workspace can never
   * impersonate another account.
   */
  workspaceMode: 'admin' | 'user';
  biometricEnabled: boolean;
  hydrated: boolean;
  locked: boolean;
};

export const sessionState = createProxy<SessionState>({
  baseUrl: VEXLUNE_HUB_URL,
  advancedUrlEnabled: false,
  saving: false,
  adminApiKey: '',
  accessToken: '',
  refreshToken: '',
  expiresAt: 0,
  user: null,
  workspaceMode: 'admin',
  biometricEnabled: false,
  hydrated: false,
  locked: false,
});

async function readSecure(key: string) {
  if (IS_WEB) return null;
  try { return await SecureStore.getItemAsync(key); } catch { return null; }
}

async function writeSecure(key: string, value: string) {
  if (IS_WEB) return;
  await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

async function deleteSecure(key: string) {
  if (IS_WEB) return;
  try { await SecureStore.deleteItemAsync(key); } catch { /* idempotent cleanup */ }
}

export type AuthStateLike = Pick<SessionState, 'accessToken' | 'user'> & Partial<Pick<SessionState, 'adminApiKey'>>;

export function hasAdminApiKey(state: Partial<Pick<SessionState, 'adminApiKey'>> = sessionState) {
  return Boolean(state.adminApiKey?.trim());
}

export function isAuthenticated(state: AuthStateLike = sessionState) {
  return hasAdminApiKey(state) || Boolean(state.accessToken && state.user);
}

export function isAdmin(user: AuthUser | null | undefined) {
  return user?.role === 'admin' || user?.role === 'administrator';
}

export async function hydrateSession() {
  sessionState.hydrated = false;
  const [accessToken, refreshToken, expiresAt, user, biometric, baseUrl] = await Promise.all([
    readSecure(ACCESS_TOKEN_KEY), readSecure(REFRESH_TOKEN_KEY), readSecure(EXPIRES_AT_KEY),
    readSecure(USER_KEY), readSecure(BIOMETRIC_KEY), readSecure(BASE_URL_KEY),
  ]);
  const adminApiKey = await readSecure(ADMIN_API_KEY_KEY);
  sessionState.accessToken = accessToken ?? '';
  sessionState.adminApiKey = adminApiKey?.trim() ?? '';
  sessionState.refreshToken = refreshToken ?? '';
  sessionState.expiresAt = Number(expiresAt ?? 0) || 0;
  sessionState.user = user ? safeParseUser(user) : null;
  sessionState.workspaceMode = sessionState.adminApiKey || isAdmin(sessionState.user) ? 'admin' : 'user';
  sessionState.biometricEnabled = biometric === 'true';
  if (baseUrl) {
    try { sessionState.baseUrl = normalizeHubUrl(baseUrl); } catch { sessionState.baseUrl = VEXLUNE_HUB_URL; }
  }
  sessionState.advancedUrlEnabled = sessionState.baseUrl !== VEXLUNE_HUB_URL;

  // The cached user is only a bootstrap value. Once a token is present, ask
  // the Hub for its authoritative user record so role changes and disabled
  // accounts take effect on a cold start. A stale access token gets one
  // normal refresh attempt first. Network failures keep the cached session so
  // the app can recover when connectivity returns; an explicit auth failure
  // clears credentials and cannot leave a stale administrator workspace open.
  // Admin API-key sessions do not have a JWT or refresh token. The key is
  // validated by the administrator login flow and then sent directly on
  // admin requests. Do not call /auth/me with an empty bearer token here.
  if (sessionState.accessToken && !sessionState.adminApiKey) {
    try {
      if (sessionState.expiresAt > 0 && Date.now() >= sessionState.expiresAt && sessionState.refreshToken) {
        const { refreshSession } = await import('@/src/services/auth');
        if (!await refreshSession()) throw new Error('SESSION_REFRESH_FAILED');
      }
      const { getCurrentUser } = await import('@/src/services/auth');
      const currentUser = await getCurrentUser();
      sessionState.workspaceMode = isAdmin(currentUser) ? 'admin' : 'user';
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status?: unknown }).status) : 0;
      const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code).toUpperCase() : '';
      const authFailure = status === 401 || status === 403 || code === '401' || code === '403' || code === 'UNAUTHORIZED' || code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN';
      if (authFailure || error instanceof Error && error.message === 'SESSION_REFRESH_FAILED') {
        await clearSession();
      }
    }
  }
  // Keep the root route behind the loading screen until the server-authority
  // check above has settled. This prevents a cached administrator role from
  // briefly rendering the wrong workspace during a cold start.
  sessionState.hydrated = true;
  sessionState.locked = sessionState.biometricEnabled && isAuthenticated() && !IS_WEB;
}

function safeParseUser(value: string): AuthUser | null {
  try {
    const parsed = JSON.parse(value) as AuthUser;
    return parsed && typeof parsed.email === 'string' ? parsed : null;
  } catch { return null; }
}

export async function saveSession(input: { accessToken: string; refreshToken?: string; expiresIn?: number; user: AuthUser; baseUrl?: string }) {
  const accessToken = input.accessToken.trim();
  if (!accessToken) throw new Error('ACCESS_TOKEN_REQUIRED');
  const baseUrl = normalizeHubUrl(input.baseUrl ?? sessionState.baseUrl);
  const expiresAt = Date.now() + Math.max(0, (input.expiresIn ?? 3600) - 30) * 1000;
  await Promise.all([
    writeSecure(ACCESS_TOKEN_KEY, accessToken),
    input.refreshToken ? writeSecure(REFRESH_TOKEN_KEY, input.refreshToken) : deleteSecure(REFRESH_TOKEN_KEY),
    writeSecure(EXPIRES_AT_KEY, String(expiresAt)),
    writeSecure(USER_KEY, JSON.stringify(input.user)),
    // A JWT session and an Admin API-key session are mutually exclusive. This
    // also prevents an old key from taking precedence over a freshly logged-in
    // JWT session in adminFetch.
    deleteSecure(ADMIN_API_KEY_KEY),
    baseUrl === VEXLUNE_HUB_URL ? deleteSecure(BASE_URL_KEY) : writeSecure(BASE_URL_KEY, baseUrl),
  ]);
  sessionState.baseUrl = baseUrl;
  sessionState.advancedUrlEnabled = baseUrl !== VEXLUNE_HUB_URL;
  sessionState.accessToken = accessToken;
  sessionState.adminApiKey = '';
  sessionState.refreshToken = input.refreshToken ?? '';
  sessionState.expiresAt = expiresAt;
  sessionState.user = input.user;
  sessionState.workspaceMode = isAdmin(input.user) ? 'admin' : 'user';
  sessionState.locked = false;
}

/**
 * Persist the official Sub2API Admin API Key in the iOS/Android keychain.
 * Admin-key and JWT credentials are mutually exclusive. The key is trimmed
 * once at the boundary and never returned by this function.
 */
export async function saveAdminApiKey(input: { adminApiKey: string; baseUrl?: string }) {
  const adminApiKey = input.adminApiKey.trim();
  if (!adminApiKey) throw new Error('ADMIN_API_KEY_REQUIRED');
  const baseUrl = normalizeHubUrl(input.baseUrl ?? sessionState.baseUrl);
  await Promise.all([
    writeSecure(ADMIN_API_KEY_KEY, adminApiKey),
    deleteSecure(ACCESS_TOKEN_KEY),
    deleteSecure(REFRESH_TOKEN_KEY),
    deleteSecure(EXPIRES_AT_KEY),
    deleteSecure(USER_KEY),
    baseUrl === VEXLUNE_HUB_URL ? deleteSecure(BASE_URL_KEY) : writeSecure(BASE_URL_KEY, baseUrl),
  ]);
  sessionState.baseUrl = baseUrl;
  sessionState.advancedUrlEnabled = baseUrl !== VEXLUNE_HUB_URL;
  sessionState.adminApiKey = adminApiKey;
  sessionState.accessToken = '';
  sessionState.refreshToken = '';
  sessionState.expiresAt = 0;
  sessionState.user = null;
  sessionState.workspaceMode = 'admin';
  sessionState.locked = false;
}

/** Replace the in-memory key while a login request is being validated. */
export function setAdminApiKey(value: string) {
  const adminApiKey = value.trim();
  if (!adminApiKey) throw new Error('ADMIN_API_KEY_REQUIRED');
  sessionState.adminApiKey = adminApiKey;
  sessionState.accessToken = '';
  sessionState.refreshToken = '';
  sessionState.expiresAt = 0;
  sessionState.user = null;
  sessionState.workspaceMode = 'admin';
}

export async function clearAdminApiKey() {
  await deleteSecure(ADMIN_API_KEY_KEY);
  sessionState.adminApiKey = '';
}

export async function updateAccessToken(input: { accessToken: string; refreshToken?: string; expiresIn?: number }) {
  const expiresAt = Date.now() + Math.max(0, (input.expiresIn ?? 3600) - 30) * 1000;
  await Promise.all([
    writeSecure(ACCESS_TOKEN_KEY, input.accessToken),
    input.refreshToken ? writeSecure(REFRESH_TOKEN_KEY, input.refreshToken) : Promise.resolve(),
    writeSecure(EXPIRES_AT_KEY, String(expiresAt)),
  ]);
  sessionState.accessToken = input.accessToken;
  if (input.refreshToken) sessionState.refreshToken = input.refreshToken;
  sessionState.expiresAt = expiresAt;
}

/** Persist the server-authoritative user record after auth/me or a role refresh. */
export async function updateSessionUser(user: AuthUser) {
  await writeSecure(USER_KEY, JSON.stringify(user));
  sessionState.user = user;
  // Every auth/me response is authoritative for both identity and the
  // initial workspace. A role promotion/demotion must take effect before any
  // route redirect is evaluated.
  sessionState.workspaceMode = isAdmin(user) ? 'admin' : 'user';
}

/**
 * Switches the first-party workspace for the signed-in administrator. The
 * server identity and bearer token do not change; this only changes which
 * client surface is shown. Ordinary users can never enter administrator mode
 * through this function.
 */
export function setWorkspaceMode(mode: 'admin' | 'user') {
  if (!isAdmin(sessionState.user)) {
    if (mode === 'user') {
      sessionState.workspaceMode = 'user';
      return;
    }
    throw new Error('ADMIN_WORKSPACE_REQUIRED');
  }
  sessionState.workspaceMode = mode;
}

export async function setBiometricEnabled(enabled: boolean) {
  if (enabled) await writeSecure(BIOMETRIC_KEY, 'true'); else await deleteSecure(BIOMETRIC_KEY);
  sessionState.biometricEnabled = enabled;
}

export async function setBaseUrl(value: string) {
  const baseUrl = normalizeHubUrl(value);
  if (baseUrl === VEXLUNE_HUB_URL) await deleteSecure(BASE_URL_KEY); else await writeSecure(BASE_URL_KEY, baseUrl);
  sessionState.baseUrl = baseUrl;
  sessionState.advancedUrlEnabled = baseUrl !== VEXLUNE_HUB_URL;
}

export async function clearSession() {
  await Promise.all([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, EXPIRES_AT_KEY, USER_KEY, ADMIN_API_KEY_KEY].map(deleteSecure));
  sessionState.accessToken = '';
  sessionState.adminApiKey = '';
  sessionState.refreshToken = '';
  sessionState.expiresAt = 0;
  sessionState.user = null;
  sessionState.workspaceMode = 'admin';
  sessionState.locked = false;
}

export const secureStoreAdapter = { getItem: readSecure, setItem: writeSecure, deleteItem: deleteSecure };
