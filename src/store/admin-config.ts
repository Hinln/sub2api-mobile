import { hasAdminApiKey, isAdmin, isAuthenticated, saveAdminApiKey, saveSession, setBaseUrl as setSessionBaseUrl, sessionState } from '@/src/auth/session';
import type { SessionState } from '@/src/auth/session';
import type { AuthUser } from '@/src/types/auth';

// Compatibility module for the existing admin feature screens. The preferred
// administrator credential is the official Sub2API Admin API Key. JWT support
// remains available for deployments that have not generated an admin key yet.
export {
  sessionState as adminConfigState,
  hydrateSession as hydrateAdminConfig,
  clearSession as logoutAdminAccount,
  saveAdminApiKey,
  clearAdminApiKey,
  hasAdminApiKey,
  setBiometricEnabled,
  setBaseUrl,
  secureStoreAdapter,
} from '@/src/auth/session';

export function hasAuthenticatedAdminSession(config: Pick<SessionState, 'accessToken' | 'user' | 'adminApiKey'>) {
  return hasAdminApiKey(config) || (isAuthenticated(config) && isAdmin(config.user));
}

export function hasAuthenticatedSession(config: Pick<SessionState, 'accessToken' | 'user' | 'adminApiKey'>) {
  return isAuthenticated(config);
}

/**
 * Compatibility entry point for screens that still call the former admin
 * settings action. New administrator screens should pass `adminApiKey`; the
 * old JWT fields remain supported for deployments using admin JWT auth.
 */
export async function saveAdminConfig(input: {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: AuthUser;
  baseUrl?: string;
  /** Official Sub2API Admin API Key sent as `x-api-key`. */
  adminApiKey?: string;
}) {
  sessionState.saving = true;
  try {
    if (input.baseUrl) await setSessionBaseUrl(input.baseUrl);
    if (input.adminApiKey?.trim()) {
      await saveAdminApiKey({ adminApiKey: input.adminApiKey, baseUrl: sessionState.baseUrl });
    } else if (input.accessToken) {
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
