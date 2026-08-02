import * as Clipboard from 'expo-clipboard';
import { Redirect, router } from 'expo-router';
import { Eye, EyeOff, Server, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_NAME, VEXLUNE_API_URL, VEXLUNE_HUB_URL } from '@/src/config/vexlune';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { queryClient } from '@/src/lib/query-client';
import { getAdminSettings } from '@/src/services/admin';
import { adminConfigState, hasAuthenticatedAdminSession, logoutAdminAccount, saveAdminConfig } from '@/src/store/admin-config';
import { theme } from '@/src/theme';

// CommonJS entry avoids import.meta in Expo Metro's classic web bundle.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useSnapshot } = require('valtio/react');

export default function LoginScreen() {
  const config = useSnapshot(adminConfigState);
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  if (hasAuthenticatedAdminSession(config) && !checking) return <Redirect href="/monitor" />;

  async function connect() {
    if (!token.trim()) {
      setError('\u8bf7\u8f93\u5165\u7ba1\u7406\u5458 Token');
      return;
    }
    setChecking(true);
    setError('');
    try {
      await saveAdminConfig({ adminApiKey: token, baseUrl: VEXLUNE_HUB_URL });
      queryClient.clear();
      await queryClient.fetchQuery({ queryKey: ['admin-settings'], queryFn: getAdminSettings });
      router.replace('/monitor');
    } catch (reason) {
      await logoutAdminAccount();
      setError(humanizeApiError(reason));
    } finally {
      setChecking(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 22 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: 30 }}>
            <View style={{ width: 76, height: 76, borderRadius: 25, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 38, fontWeight: '900' }}>H</Text></View>
            <Text style={{ color: theme.text, fontSize: 27, fontWeight: '900', marginTop: 18 }}>{APP_NAME}</Text>
            <Text style={{ color: theme.subtext, fontSize: 13, marginTop: 6 }}>AI Gateway 移动运营控制台</Text>
          </View>

          <View style={{ backgroundColor: theme.card, borderRadius: 24, borderColor: theme.border, borderWidth: 1, padding: 18 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Server color={theme.primary} size={21} /><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>{'\u7ba1\u7406\u9762\u677f'}</Text><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>{VEXLUNE_HUB_URL}</Text></View><ShieldCheck color={theme.success} size={18} /></View>
            <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 16 }} />
            <Text style={{ color: theme.subtext, fontSize: 12, marginBottom: 8 }}>{'\u7ba1\u7406\u5458 Token'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 16, backgroundColor: theme.cardRaised, borderWidth: 1, borderColor: error ? theme.danger : theme.border }}>
              <TextInput
                accessibilityLabel="admin-token"
                value={token}
                onChangeText={(value) => { setToken(value); setError(''); }}
                placeholder="admin-xxxxxxxx"
                placeholderTextColor={theme.faint}
                secureTextEntry={!showToken}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={() => void connect()}
                style={{ flex: 1, color: theme.text, fontSize: 16, paddingHorizontal: 15, paddingVertical: 14 }}
              />
              <Pressable accessibilityLabel="toggle-token" onPress={() => setShowToken((value) => !value)} style={{ padding: 12 }}>{showToken ? <EyeOff color={theme.subtext} size={19} /> : <Eye color={theme.subtext} size={19} />}</Pressable>
            </View>
            <Pressable onPress={async () => { const value = await Clipboard.getStringAsync(); setToken(value); setError(''); }} style={{ alignSelf: 'flex-end', paddingVertical: 10 }}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>{'\u4ece\u526a\u8d34\u677f\u7c98\u8d34'}</Text></Pressable>
            {error ? <View style={{ backgroundColor: theme.dangerSoft, borderRadius: 13, padding: 11, marginBottom: 12 }}><Text style={{ color: theme.danger, fontSize: 13, lineHeight: 19 }}>{error}</Text></View> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="connect" disabled={checking} onPress={() => void connect()} style={{ borderRadius: 16, minHeight: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: checking ? theme.muted : theme.primary }}>
              {checking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{'\u9a8c\u8bc1\u5e76\u8fdb\u5165'}</Text>}
            </Pressable>
          </View>

          <Text style={{ color: theme.faint, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 18 }}>{'\u51ed\u636e\u4ec5\u4fdd\u5b58\u5728\u672c\u673a SecureStore\uff0c\u4e0d\u4f1a\u5199\u5165\u65e5\u5fd7\u3002\n\u6a21\u578b API \u5730\u5740\uff1a'}{VEXLUNE_API_URL}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
