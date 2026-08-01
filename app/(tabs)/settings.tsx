import * as LocalAuthentication from 'expo-local-authentication';
import { RotateCcw, Save, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { Card, Page, SectionTitle } from '@/src/components/ui';
import { normalizeHubUrl, VEXLUNE_HUB_URL } from '@/src/config/vexlune';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { queryClient } from '@/src/lib/query-client';
import { getAdminSettings } from '@/src/services/admin';
import { adminConfigState, restoreDefaultHubUrl, saveAdminConfig, setBiometricEnabled } from '@/src/store/admin-config';
import { theme } from '@/src/theme';

// CommonJS entry avoids import.meta in Expo Metro's classic web bundle.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useSnapshot } = require('valtio/react');

export default function SettingsScreen() {
  const config = useSnapshot(adminConfigState);
  const [advanced, setAdvanced] = useState(config.advancedUrlEnabled);
  const [url, setUrl] = useState(config.baseUrl);
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const baseUrl = advanced ? normalizeHubUrl(url) : VEXLUNE_HUB_URL;
      await saveAdminConfig({ baseUrl, adminApiKey: token.trim() || config.adminApiKey });
      queryClient.clear();
      await queryClient.fetchQuery({ queryKey: ['admin-settings'], queryFn: getAdminSettings });
      setToken('');
      setMessage('\u8fde\u63a5\u8bbe\u7f6e\u5df2\u9a8c\u8bc1\u5e76\u4fdd\u5b58');
    } catch (error) {
      setMessage(humanizeApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function toggleBiometric(value: boolean) {
    if (Platform.OS === 'web') return;
    if (value) {
      const [hardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
      if (!hardware || !enrolled) {
        Alert.alert('\u65e0\u6cd5\u542f\u7528', '\u5f53\u524d\u8bbe\u5907\u672a\u914d\u7f6e Face ID\u3001Touch ID \u6216\u8bbe\u5907\u5bc6\u7801\u3002');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: '\u786e\u8ba4\u542f\u7528\u751f\u7269\u8bc6\u522b\u9501', disableDeviceFallback: false });
      if (!result.success) return;
    }
    await setBiometricEnabled(value);
  }

  return (
    <Page title={'\u8fde\u63a5\u4e0e\u5b89\u5168'} subtitle={'\u9ed8\u8ba4\u4ec5\u8fde\u63a5 Vexlune Hub\uff0c\u51ed\u636e\u4fdd\u5b58\u5728 SecureStore'}>
      <SectionTitle title={'\u7ba1\u7406\u8fde\u63a5'} />
      <Card>
        <Text style={{ color: theme.faint, fontSize: 11 }}>{'\u5f53\u524d\u9762\u677f\u5730\u5740'}</Text><Text selectable style={{ color: theme.text, fontSize: 14, marginTop: 6 }}>{config.baseUrl}</Text>
        <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 16 }} />
        <Text style={{ color: theme.subtext, fontSize: 12, marginBottom: 8 }}>{'\u66f4\u6362\u7ba1\u7406\u5458 Token\uff08\u7559\u7a7a\u5219\u4e0d\u53d8\uff09'}</Text>
        <TextInput accessibilityLabel="replace-admin-token" value={token} onChangeText={setToken} secureTextEntry autoCapitalize="none" placeholder="admin-xxxxxxxx" placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 13 }} />
      </Card>

      <SectionTitle title={'\u9ad8\u7ea7\u8bbe\u7f6e'} />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>{'\u5141\u8bb8\u8986\u76d6\u9762\u677f\u5730\u5740'}</Text><Text style={{ color: theme.subtext, fontSize: 11, lineHeight: 17, marginTop: 5 }}>{'\u4ec5\u7528\u4e8e\u707e\u5907\u6216\u6d4b\u8bd5\uff1b\u53ea\u5141\u8bb8 HTTPS\uff0c\u4e0d\u5141\u8bb8\u6a21\u578b API \u57df\u540d\u3002'}</Text></View><Switch value={advanced} onValueChange={(value) => { setAdvanced(value); if (!value) setUrl(VEXLUNE_HUB_URL); }} trackColor={{ false: theme.muted, true: theme.primary }} /></View>
        {advanced ? <TextInput accessibilityLabel="advanced-hub-url" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} placeholder="https://hub.example.com" placeholderTextColor={theme.faint} style={{ marginTop: 14, color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 13 }} /> : null}
        {config.advancedUrlEnabled ? <Pressable onPress={() => void restoreDefaultHubUrl().then(() => { setAdvanced(false); setUrl(VEXLUNE_HUB_URL); queryClient.clear(); })} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13 }}><RotateCcw color={theme.primary} size={15} /><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>{'\u6062\u590d Vexlune \u9ed8\u8ba4\u5730\u5740'}</Text></Pressable> : null}
      </Card>

      <SectionTitle title={'\u672c\u5730\u5e94\u7528\u9501'} />
      <Card><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: theme.successSoft, alignItems: 'center', justifyContent: 'center' }}><ShieldCheck color={theme.success} size={19} /></View><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>Face ID / Touch ID</Text><Text style={{ color: theme.subtext, fontSize: 11, lineHeight: 17, marginTop: 4 }}>{Platform.OS === 'web' ? '\u4ec5\u539f\u751f iOS/Android \u53ef\u7528' : '\u5e94\u7528\u56de\u5230\u540e\u53f0\u65f6\u81ea\u52a8\u9501\u5b9a\uff0c\u5141\u8bb8\u8bbe\u5907\u5bc6\u7801\u56de\u9000'}</Text></View><Switch disabled={Platform.OS === 'web'} value={config.biometricEnabled} onValueChange={(value) => void toggleBiometric(value)} trackColor={{ false: theme.muted, true: theme.primary }} /></View></Card>

      {message ? <Text style={{ color: message.includes('\u5df2\u9a8c\u8bc1') ? theme.success : theme.danger, fontSize: 13, lineHeight: 19, marginTop: 14 }}>{message}</Text> : null}
      <Pressable disabled={saving} onPress={() => void save()} style={{ marginTop: 18, minHeight: 50, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: saving ? theme.muted : theme.primary }}><Save color="#FFFFFF" size={17} /><Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{saving ? '\u6b63\u5728\u9a8c\u8bc1...' : '\u9a8c\u8bc1\u5e76\u4fdd\u5b58'}</Text></Pressable>
    </Page>
  );
}
