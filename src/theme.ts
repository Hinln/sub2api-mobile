import * as SecureStore from 'expo-secure-store';
import { Appearance, Platform } from 'react-native';

// CommonJS avoids Metro's import.meta handling in the web build.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { proxy } = require('valtio');

export type ThemeMode = 'light' | 'dark' | 'system';
const THEME_MODE_KEY = 'vexlune_theme_mode_v1';
const IS_WEB = Platform.OS === 'web';

export type ThemePalette = {
  page: string; card: string; cardRaised: string; muted: string; border: string;
  primary: string; primarySoft: string; text: string; subtext: string; faint: string;
  success: string; successSoft: string; warning: string; warningSoft: string; danger: string; dangerSoft: string;
};

const light: ThemePalette = {
  page: '#F4F8FF', card: '#FFFFFF', cardRaised: '#EEF4FF', muted: '#E1EAF8', border: '#DDE7F5',
  primary: '#5368C7', primarySoft: '#E8EEFF', text: '#16233D', subtext: '#64728D', faint: '#95A3BA',
  success: '#25846A', successSoft: '#E5F6EF', warning: '#A96B12', warningSoft: '#FFF3DB', danger: '#C75365', dangerSoft: '#FCE9EE',
};

const dark: ThemePalette = {
  page: '#08080B', card: '#121218', cardRaised: '#191921', muted: '#23232D', border: '#2D2D39',
  primary: '#A78BFA', primarySoft: '#271D42', text: '#F7F7FA', subtext: '#B8B2C0', faint: '#807A89',
  success: '#54D6A4', successSoft: '#112D26', warning: '#F5BD69', warningSoft: '#332813', danger: '#FF7180', dangerSoft: '#34171C',
};

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
