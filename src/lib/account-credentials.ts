/**
 * Credential keys that the official Sub2API admin response never exposes as
 * editable values. Keep this defensive client-side filter in sync with the
 * server redaction list so a future response change cannot make a model-only
 * update echo a secret back to the API.
 */
export const SENSITIVE_ACCOUNT_CREDENTIAL_KEYS = new Set([
  'access_token',
  'refresh_token',
  'id_token',
  'agent_private_key',
  'api_key',
  'session_key',
  'cookie',
  'password',
  'sso_token',
  'sso',
  'sso-rw',
  'clearTextPassword',
  'aws_secret_access_key',
  'aws_session_token',
  'service_account_json',
  'service_account',
  'private_key',
]);

/**
 * Builds the complete non-sensitive credentials object required by the
 * official account update endpoint when changing only model_mapping.
 *
 * Sub2API preserves omitted sensitive fields, but it replaces the complete
 * non-sensitive credential object. Sending only model_mapping would therefore
 * clear values such as base_url or header overrides. The account detail
 * response is already redacted; we still filter the known secret keys here as
 * a second safety boundary and deliberately ignore credentials_status.
 */
export function buildRedactedAccountCredentialsForMapping(
  credentials: Record<string, unknown> | undefined,
  selectedModels: string[],
): Record<string, unknown> | null {
  if (!credentials || Array.isArray(credentials) || typeof credentials !== 'object') return null;

  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(credentials)) {
    if (key === 'model_mapping' || SENSITIVE_ACCOUNT_CREDENTIAL_KEYS.has(key)) continue;
    next[key] = value;
  }
  next.model_mapping = Object.fromEntries(selectedModels.map((model) => [model, model]));
  return next;
}
