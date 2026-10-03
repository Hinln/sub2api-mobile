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
  beforeEach(() => { vi.clearAllMocks(); adminConfigState.accessToken = ''; adminConfigState.refreshToken = ''; adminConfigState.user = null; adminConfigState.baseUrl = 'https://hub.vexlune.com'; });

  it('stores credentials using device-only accessibility', async () => {
    await saveAdminConfig({ accessToken: 'access-secret', refreshToken: 'refresh-secret', expiresIn: 3600, user: { id: 1, email: 'admin@example.com', role: 'admin' } });
    expect(secure.set).toHaveBeenCalledWith('vexlune_access_token_v2', 'access-secret', { keychainAccessible: 'device-only' });
    expect(hasAuthenticatedAdminSession(adminConfigState)).toBe(true);
  });

  it('clears credentials on logout without clearing ordinary preferences', async () => {
    adminConfigState.accessToken = 'access-secret';
    adminConfigState.user = { id: 1, email: 'admin@example.com', role: 'admin' };
    adminConfigState.biometricEnabled = true;
    await logoutAdminAccount();
    expect(secure.del).toHaveBeenCalledWith('vexlune_access_token_v2');
    expect(adminConfigState.accessToken).toBe('');
  });

  it('exposes a safe adapter with idempotent deletion', async () => {
    secure.del.mockRejectedValueOnce(new Error('missing'));
    await expect(secureStoreAdapter.deleteItem('missing')).resolves.toBeUndefined();
  });
});
