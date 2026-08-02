import * as SecureStore from 'expo-secure-store';
import { Appearance, Platform } from 'react-native';

// CommonJS avoids Metro's import.meta handling in the web build.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { proxy } = require('valtio');

export type ThemeMode = 'light' | 'dark' | 'system';
const THEME_MODE_KEY = 'vexlune_theme_mode_v1';
const IS_WEB = Platform.OS === 'web';

const light = {
  page: '#F6F5F9', card: '#FFFFFF', cardRaised: '#F0EEF5', muted: '#E5E1EC', border: '#E4E0EA',
  primary: '#7C3AED', primarySoft: '#EEE7FF', text: '#17141F', subtext: '#696273', faint: '#938B9F',
  success: '#16825C', successSoft: '#E6F6EF', warning: '#B86905', warningSoft: '#FFF2DB', danger: '#C73D53', dangerSoft: '#FDE9ED',
} as const;

const dark = {
  page: '#08080B', card: '#121218', cardRaised: '#191921', muted: '#23232D', border: '#2D2D39',
  primary: '#A78BFA', primarySoft: '#271D42', text: '#F7F7FA', subtext: '#B8B2C0', faint: '#807A89',
  success: '#54D6A4', successSoft: '#112D26', warning: '#F5BD69', warningSoft: '#332813', danger: '#FF7180', dangerSoft: '#34171C',
} as const;

export type ThemePalette = typeof light;
export const themePreferences = proxy({ mode: 'light' as ThemeMode, hydrated: false });

export function resolvedThemeMode(mode = themePreferences.mode) {
  return mode === 'system' ? (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light') : mode;
}

function activePalette(): ThemePalette { return resolvedThemeMode() === 'dark' ? dark : light; }

// Existing screens read `theme.*`; a Proxy lets every screen adopt the persisted
// palette without duplicating palette selection logic in each component.
export const theme = new Proxy({} as ThemePalette, {
  get(_target, key: keyof ThemePalette) { return activePalette()[key]; },
}) as ThemePalette;

async function readTheme() {
  if (IS_WEB) return null;
  try { return await SecureStore.getItemAsync(THEME_MODE_KEY); } catch { return null; }
}

export async function hydrateThemePreference() {
  const value = await readTheme();
  if (value === 'light' || value === 'dark' || value === 'system') themePreferences.mode = value;
  themePreferences.hydrated = true;
}

export async function setThemeMode(mode: ThemeMode) {
  themePreferences.mode = mode;
  if (!IS_WEB) await SecureStore.setItemAsync(THEME_MODE_KEY, mode, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}
