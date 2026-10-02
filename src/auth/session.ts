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
  /** @deprecated API-key authentication was removed; retained only for source compatibility. */
  adminApiKey: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser | null;
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

export function isAuthenticated(state: Pick<SessionState, 'accessToken' | 'user'> = sessionState) {
  return Boolean(state.accessToken && state.user);
}

export function isAdmin(user: AuthUser | null | undefined) {
  return user?.role === 'admin' || user?.role === 'administrator';
}

export async function hydrateSession() {
  const [accessToken, refreshToken, expiresAt, user, biometric, baseUrl] = await Promise.all([
    readSecure(ACCESS_TOKEN_KEY), readSecure(REFRESH_TOKEN_KEY), readSecure(EXPIRES_AT_KEY),
    readSecure(USER_KEY), readSecure(BIOMETRIC_KEY), readSecure(BASE_URL_KEY),
  ]);
  sessionState.accessToken = accessToken ?? '';
  // Deliberately never hydrate or persist the removed admin API-key field.
  sessionState.adminApiKey = '';
  sessionState.refreshToken = refreshToken ?? '';
  sessionState.expiresAt = Number(expiresAt ?? 0) || 0;
  sessionState.user = user ? safeParseUser(user) : null;
  sessionState.biometricEnabled = biometric === 'true';
  if (baseUrl) {
    try { sessionState.baseUrl = normalizeHubUrl(baseUrl); } catch { sessionState.baseUrl = VEXLUNE_HUB_URL; }
  }
  sessionState.advancedUrlEnabled = sessionState.baseUrl !== VEXLUNE_HUB_URL;
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
    baseUrl === VEXLUNE_HUB_URL ? deleteSecure(BASE_URL_KEY) : writeSecure(BASE_URL_KEY, baseUrl),
  ]);
  sessionState.baseUrl = baseUrl;
  sessionState.advancedUrlEnabled = baseUrl !== VEXLUNE_HUB_URL;
  sessionState.accessToken = accessToken;
  sessionState.refreshToken = input.refreshToken ?? '';
  sessionState.expiresAt = expiresAt;
  sessionState.user = input.user;
  sessionState.locked = false;
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
  await Promise.all([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, EXPIRES_AT_KEY, USER_KEY].map(deleteSecure));
  sessionState.accessToken = '';
  sessionState.adminApiKey = '';
  sessionState.refreshToken = '';
  sessionState.expiresAt = 0;
  sessionState.user = null;
  sessionState.locked = false;
}

export const secureStoreAdapter = { getItem: readSecure, setItem: writeSecure, deleteItem: deleteSecure };
