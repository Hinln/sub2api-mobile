import { beforeEach, describe, expect, it, vi } from 'vitest';

const secure = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: secure.get,
  setItemAsync: secure.set,
}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' }, Appearance: { getColorScheme: () => 'dark' } }));

import { hydrateThemePreference, resolvedThemeMode, setThemeMode, theme, themePreferences } from '@/src/theme';

describe('theme preferences', () => {
  beforeEach(() => { vi.clearAllMocks(); themePreferences.mode = 'light'; themePreferences.hydrated = false; });

  it('defaults to light and persists a selected theme without touching credentials', async () => {
    expect(theme.page).toBe('#F6F5F9');
    await setThemeMode('dark');
    expect(themePreferences.mode).toBe('dark');
    expect(theme.page).toBe('#08080B');
    expect(secure.set).toHaveBeenCalledWith('vexlune_theme_mode_v1', 'dark', { keychainAccessible: 'device-only' });
  });

  it('migrates a saved preference and resolves system appearance', async () => {
    secure.get.mockResolvedValueOnce('system');
    await hydrateThemePreference();
    expect(themePreferences.mode).toBe('system');
    expect(themePreferences.hydrated).toBe(true);
    expect(resolvedThemeMode()).toBe('dark');
  });
});
