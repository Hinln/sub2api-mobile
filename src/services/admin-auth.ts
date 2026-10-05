import { clearAdminApiKey, saveAdminApiKey, sessionState } from '@/src/auth/session';
import { adminFetch, ApiError } from '@/src/lib/admin-fetch';

/**
 * Cloudflare can take longer than the normal 15 second API budget to finish
 * the first edge/QUIC request. The production probe observed a successful
 * admin-key status response after roughly 34 seconds, so the one-shot login
 * validation gets the documented 60 second caller override. Other admin
 * requests keep the normal client timeout.
 */
export const ADMIN_KEY_VALIDATION_TIMEOUT_MS = 60_000;

/** Response returned by the official v0.2.13 admin key status endpoint. */
export type AdminApiKeyStatus = {
  exists: boolean;
  masked_key: string;
};

export type AdminComplianceStatus = {
  required: boolean;
  version: string;
  document_url_zh?: string;
  document_url_en?: string;
  ack_phrase_zh?: string;
  ack_phrase_en?: string;
  acknowledgement?: { version?: string; accepted_at?: string };
};

/**
 * Validate an Admin API Key against the official Sub2API middleware and then
 * persist it in SecureStore when the native Keychain is available. An
 * unsigned/ad-hoc simulator can only keep the already validated key in memory
 * for that run. The key is sent only as `x-api-key`; it is never put in a URL,
 * request body, log, or ordinary app storage.
 */
export async function validateAdminApiKey(value: string): Promise<AdminApiKeyStatus> {
  const adminApiKey = value.trim();
  if (!adminApiKey) throw new ApiError('请输入管理员 API Key', { code: 'ADMIN_API_KEY_REQUIRED' });

  const status = await adminFetch<AdminApiKeyStatus>('/api/v1/admin/settings/admin-api-key', {}, {
    adminApiKey,
    retry: 0,
    timeoutMs: ADMIN_KEY_VALIDATION_TIMEOUT_MS,
  });

  if (!status || status.exists !== true || typeof status.masked_key !== 'string') {
    throw new ApiError('服务器未配置可用的管理员 API Key', { status: 401, code: 'ADMIN_KEY_NOT_CONFIGURED' });
  }

  await saveAdminApiKey({ adminApiKey, baseUrl: sessionState.baseUrl });
  return status;
}

/** Read the official compliance status while the key is still one-shot. */
export function getAdminComplianceStatus(value: string) {
  return adminFetch<AdminComplianceStatus>('/api/v1/admin/compliance', {}, { adminApiKey: value.trim(), retry: 0 });
}

/** Record the explicit administrator acknowledgement required by the server. */
export function acceptAdminCompliance(value: string, phrase: string, language = 'zh') {
  return adminFetch<AdminComplianceStatus>('/api/v1/admin/compliance/accept', {
    method: 'POST',
    body: JSON.stringify({ phrase, language }),
  }, { adminApiKey: value.trim(), retry: 0 });
}

/** Clear the local admin credential. Admin API Keys have no server logout route. */
export async function logoutAdminKey() {
  await clearAdminApiKey();
}
