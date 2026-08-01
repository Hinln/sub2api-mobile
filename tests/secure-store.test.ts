import { beforeEach, describe, expect, it, vi } from 'vitest';

const secure = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }));
vi.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: secure.get,
  setItemAsync: secure.set,
  deleteItemAsync: secure.del,
}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import { adminConfigState, hasAuthenticatedAdminSession, logoutAdminAccount, saveAdminConfig, secureStoreAdapter } from '@/src/store/admin-config';

describe('SecureStore adapter', () => {
  beforeEach(() => { vi.clearAllMocks(); adminConfigState.adminApiKey = ''; adminConfigState.baseUrl = 'https://hub.vexlune.com'; });

  it('stores credentials using device-only accessibility', async () => {
    await saveAdminConfig({ adminApiKey: 'admin-secret' });
    expect(secure.set).toHaveBeenCalledWith('vexlune_admin_api_key_v1', 'admin-secret', { keychainAccessible: 'device-only' });
    expect(hasAuthenticatedAdminSession(adminConfigState)).toBe(true);
  });

  it('clears credentials on logout without clearing ordinary preferences', async () => {
    adminConfigState.adminApiKey = 'admin-secret';
    adminConfigState.biometricEnabled = true;
    await logoutAdminAccount();
    expect(secure.del).toHaveBeenCalledWith('vexlune_admin_api_key_v1');
    expect(secure.del).toHaveBeenCalledWith('vexlune_biometric_lock_v1');
    expect(adminConfigState.adminApiKey).toBe('');
    expect(adminConfigState.biometricEnabled).toBe(false);
  });

  it('exposes a safe adapter with idempotent deletion', async () => {
    secure.del.mockRejectedValueOnce(new Error('missing'));
    await expect(secureStoreAdapter.deleteItem('missing')).resolves.toBeUndefined();
  });
});
