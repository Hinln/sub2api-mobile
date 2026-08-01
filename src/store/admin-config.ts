import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { normalizeHubUrl, VEXLUNE_HUB_URL } from '@/src/config/vexlune';

// CommonJS entry avoids import.meta in Expo Metro's classic web bundle.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { proxy } = require('valtio');

const ADMIN_KEY_KEY = 'vexlune_admin_api_key_v1';
const BIOMETRIC_KEY = 'vexlune_biometric_lock_v1';
const ADVANCED_URL_KEY = 'vexlune_advanced_hub_url_v1';
const IS_WEB = Platform.OS === 'web';

export type AdminConfig = {
  baseUrl: string;
  adminApiKey: string;
  biometricEnabled: boolean;
  advancedUrlEnabled: boolean;
  hydrated: boolean;
  saving: boolean;
};

export const adminConfigState = proxy({
  baseUrl: VEXLUNE_HUB_URL,
  adminApiKey: '',
  biometricEnabled: false,
  advancedUrlEnabled: false,
  hydrated: false,
  saving: false,
}) as AdminConfig;

async function readSecure(key: string) {
  if (IS_WEB) return null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeSecure(key: string, value: string) {
  if (IS_WEB) return;
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function deleteSecure(key: string) {
  if (IS_WEB) return;
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Deleting an already missing credential is safe and idempotent.
  }
}

export function hasAuthenticatedAdminSession(config: Pick<AdminConfig, 'baseUrl' | 'adminApiKey'>) {
  return Boolean(config.baseUrl.trim() && config.adminApiKey.trim());
}

export async function hydrateAdminConfig() {
  try {
    const [key, biometric, advancedUrl] = await Promise.all([
      readSecure(ADMIN_KEY_KEY),
      readSecure(BIOMETRIC_KEY),
      readSecure(ADVANCED_URL_KEY),
    ]);

    adminConfigState.adminApiKey = key ?? '';
    adminConfigState.biometricEnabled = biometric === 'true';
    if (advancedUrl) {
      try {
        adminConfigState.baseUrl = normalizeHubUrl(advancedUrl);
        adminConfigState.advancedUrlEnabled = adminConfigState.baseUrl !== VEXLUNE_HUB_URL;
      } catch {
        adminConfigState.baseUrl = VEXLUNE_HUB_URL;
      }
    }
  } finally {
    adminConfigState.hydrated = true;
  }
}

export async function saveAdminConfig(input: { adminApiKey: string; baseUrl?: string }) {
  const adminApiKey = input.adminApiKey.trim();
  const baseUrl = normalizeHubUrl(input.baseUrl || VEXLUNE_HUB_URL);
  if (!adminApiKey) throw new Error('ADMIN_API_KEY_REQUIRED');

  adminConfigState.saving = true;
  try {
    await Promise.all([
      writeSecure(ADMIN_KEY_KEY, adminApiKey),
      baseUrl === VEXLUNE_HUB_URL ? deleteSecure(ADVANCED_URL_KEY) : writeSecure(ADVANCED_URL_KEY, baseUrl),
    ]);
    adminConfigState.adminApiKey = adminApiKey;
    adminConfigState.baseUrl = baseUrl;
    adminConfigState.advancedUrlEnabled = baseUrl !== VEXLUNE_HUB_URL;
  } finally {
    adminConfigState.saving = false;
  }
}

export async function setBiometricEnabled(enabled: boolean) {
  if (enabled) await writeSecure(BIOMETRIC_KEY, 'true');
  else await deleteSecure(BIOMETRIC_KEY);
  adminConfigState.biometricEnabled = enabled;
}

export async function restoreDefaultHubUrl() {
  await deleteSecure(ADVANCED_URL_KEY);
  adminConfigState.baseUrl = VEXLUNE_HUB_URL;
  adminConfigState.advancedUrlEnabled = false;
}

export async function logoutAdminAccount() {
  await Promise.all([deleteSecure(ADMIN_KEY_KEY), deleteSecure(BIOMETRIC_KEY)]);
  adminConfigState.adminApiKey = '';
  adminConfigState.biometricEnabled = false;
}

export const secureStoreAdapter = {
  getItem: readSecure,
  setItem: writeSecure,
  deleteItem: deleteSecure,
};
