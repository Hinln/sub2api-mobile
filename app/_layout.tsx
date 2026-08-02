import '@/src/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import * as LocalAuthentication from 'expo-local-authentication';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { setUnauthorizedHandler } from '@/src/lib/admin-fetch';
import { queryClient } from '@/src/lib/query-client';
import { adminConfigState, hydrateAdminConfig, logoutAdminAccount } from '@/src/store/admin-config';
import { hydrateThemePreference, resolvedThemeMode, theme, themePreferences } from '@/src/theme';

// CommonJS entry avoids import.meta in Expo Metro's classic web bundle.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useSnapshot } = require('valtio/react');

export const unstable_settings = { initialRouteName: '(tabs)' };

function LoadingScreen() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.page }}><ActivityIndicator color={theme.primary} /></View>;
}

function LockedScreen({ unlock }: { unlock: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: theme.page }}>
      <View style={{ width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primarySoft }}>
        <Text style={{ color: theme.primary, fontSize: 32, fontWeight: '900' }}>V</Text>
      </View>
      <Text style={{ marginTop: 24, color: theme.text, fontSize: 24, fontWeight: '800' }}>{'\u5df2\u9501\u5b9a'}</Text>
      <Text style={{ marginTop: 10, color: theme.subtext, lineHeight: 21, textAlign: 'center' }}>{'\u4f7f\u7528 Face ID\u3001Touch ID \u6216\u8bbe\u5907\u5bc6\u7801\u89e3\u9501 Vexlune \u7ba1\u7406\u63a7\u5236\u53f0\u3002'}</Text>
      <Pressable onPress={unlock} style={{ marginTop: 24, borderRadius: 16, backgroundColor: theme.primary, paddingHorizontal: 28, paddingVertical: 14 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{'\u89e3\u9501'}</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const config = useSnapshot(adminConfigState);
  const appearance = useSnapshot(themePreferences);
  const [unlocked, setUnlocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  const unlock = useCallback(async () => {
    if (Platform.OS === 'web' || !adminConfigState.biometricEnabled || !adminConfigState.adminApiKey) {
      setUnlocked(true);
      return;
    }
    if (authenticating) return;
    setAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: '\u89e3\u9501 Vexlune',
        cancelLabel: '\u53d6\u6d88',
        fallbackLabel: '\u4f7f\u7528\u8bbe\u5907\u5bc6\u7801',
        disableDeviceFallback: false,
      });
      if (result.success) setUnlocked(true);
    } finally {
      setAuthenticating(false);
    }
  }, [authenticating]);

  useEffect(() => { void hydrateAdminConfig(); void hydrateThemePreference(); }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && adminConfigState.biometricEnabled && adminConfigState.adminApiKey) setUnlocked(false);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logoutAdminAccount().finally(() => {
        queryClient.clear();
        router.replace('/login');
      });
    });
    return () => setUnauthorizedHandler(undefined);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={resolvedThemeMode(appearance.mode) === 'dark' ? 'light' : 'dark'} />
      <QueryClientProvider client={queryClient}>
        {!config.hydrated || !appearance.hydrated ? <LoadingScreen /> : Platform.OS !== 'web' && config.biometricEnabled && Boolean(config.adminApiKey) && !unlocked ? <LockedScreen unlock={() => void unlock()} /> : (
          <Stack key={appearance.mode} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.page } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
            <Stack.Screen name="users/[id]" options={{ headerShown: true, title: '\u7528\u6237\u8be6\u60c5', headerTintColor: theme.text, headerStyle: { backgroundColor: theme.page }, headerShadowVisible: false }} />
            <Stack.Screen name="users/create-user" options={{ headerShown: true, title: '\u521b\u5efa\u7528\u6237', headerTintColor: theme.text, headerStyle: { backgroundColor: theme.page }, headerShadowVisible: false }} />
            <Stack.Screen name="accounts/[id]" options={{ headerShown: true, title: '\u8d26\u53f7\u8be6\u60c5', headerTintColor: theme.text, headerStyle: { backgroundColor: theme.page }, headerShadowVisible: false }} />
            <Stack.Screen name="exceptions" options={{ headerShown: true, title: '\u5f02\u5e38\u4e2d\u5fc3', headerTintColor: theme.text, headerStyle: { backgroundColor: theme.page }, headerShadowVisible: false }} />
            <Stack.Screen name="about" options={{ headerShown: true, title: '\u5173\u4e8e', headerTintColor: theme.text, headerStyle: { backgroundColor: theme.page }, headerShadowVisible: false }} />
          </Stack>
        )}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
