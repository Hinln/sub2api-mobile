import { isAdmin, isAuthenticated, saveSession, setBaseUrl as setSessionBaseUrl, sessionState } from '@/src/auth/session';
import type { SessionState } from '@/src/auth/session';
import type { AuthUser } from '@/src/types/auth';

// Compatibility module for the existing admin feature screens. Authentication is
// now email/password + Bearer JWT; no API-key credential is stored or accepted.
export {
  sessionState as adminConfigState,
  hydrateSession as hydrateAdminConfig,
  clearSession as logoutAdminAccount,
  setBiometricEnabled,
  setBaseUrl,
  secureStoreAdapter,
} from '@/src/auth/session';

export function hasAuthenticatedAdminSession(config: Pick<SessionState, 'accessToken' | 'user'>) {
  return isAuthenticated(config) && isAdmin(config.user);
}

export function hasAuthenticatedSession(config: Pick<SessionState, 'accessToken' | 'user'>) {
  return isAuthenticated(config);
}

/**
 * Compatibility entry point for screens that still call the former admin
 * settings action. New callers must provide the JWT returned by auth/login and
 * the server user record. API-key credentials are deliberately rejected.
 */
export async function saveAdminConfig(input: {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: AuthUser;
  baseUrl?: string;
  /** @deprecated API-key authentication is removed; use accessToken. */
  adminApiKey?: string;
}) {
  if (input.adminApiKey?.trim()) throw new Error('LEGACY_ADMIN_API_KEY_UNSUPPORTED');
  sessionState.saving = true;
  try {
    if (input.baseUrl) await setSessionBaseUrl(input.baseUrl);
    if (input.accessToken) {
      if (!input.user) throw new Error('AUTH_USER_REQUIRED');
      await saveSession({
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresIn: input.expiresIn,
        user: input.user,
        baseUrl: sessionState.baseUrl,
      });
    }
  } finally {
    sessionState.saving = false;
  }
}

export async function restoreDefaultHubUrl() {
  const { setBaseUrl } = await import('@/src/auth/session');
  const { VEXLUNE_HUB_URL } = await import('@/src/config/vexlune');
  await setBaseUrl(VEXLUNE_HUB_URL);
}
