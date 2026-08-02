import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { useLocalSearchParams } from 'expo-router';
import { RotateCcw, Save, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, Pressable, Switch, Text, TextInput, View } from 'react-native';

import { Card, Page, SectionTitle, StateCard } from '@/src/components/ui';
import { APP_NAME, APP_VERSION, normalizeHubUrl, VEXLUNE_HUB_URL } from '@/src/config/vexlune';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { queryClient } from '@/src/lib/query-client';
import { getAdminSettings, getSystemVersion } from '@/src/services/admin';
import { adminConfigState, restoreDefaultHubUrl, saveAdminConfig, setBiometricEnabled } from '@/src/store/admin-config';
import { setThemeMode, theme, themePreferences, type ThemeMode } from '@/src/theme';

// CommonJS entry avoids import.meta in Expo Metro's classic web bundle.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useSnapshot } = require('valtio/react');

function displayDate(value?: string) {
  if (!value) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
}

function displayUptime(seconds?: number) {
  if (typeof seconds !== 'number') return '--';
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return days > 0 ? `${days} 天 ${hours} 小时` : `${hours} 小时 ${minutes} 分钟`;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={{ color: theme.faint, fontSize: 11 }}>{label}</Text>
      <Text selectable style={{ color: theme.text, fontSize: 13, lineHeight: 19, marginTop: 4 }}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const params = useLocalSearchParams<{ section?: string | string[] }>();
  const rawSection = Array.isArray(params.section) ? params.section[0] : params.section;
  const section = rawSection === 'security' || rawSection === 'system' ? rawSection : 'all';
  const showSecurity = section !== 'system';
  const showSystem = section !== 'security';
  const config = useSnapshot(adminConfigState);
  const appearance = useSnapshot(themePreferences);
  const [advanced, setAdvanced] = useState(config.advancedUrlEnabled);
  const [url, setUrl] = useState(config.baseUrl);
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);
  const versionQuery = useQuery({ queryKey: ['system-version'], queryFn: getSystemVersion, enabled: showSystem, staleTime: 60_000 });
  const settingsQuery = useQuery({ queryKey: ['admin-settings'], queryFn: getAdminSettings, enabled: showSystem, staleTime: 60_000 });

  async function save() {
    setSaving(true);
    setMessage('');
    setMessageError(false);
    try {
      const baseUrl = advanced ? normalizeHubUrl(url) : VEXLUNE_HUB_URL;
      await saveAdminConfig({ baseUrl, adminApiKey: token.trim() || config.adminApiKey });
      queryClient.clear();
      await queryClient.fetchQuery({ queryKey: ['admin-settings'], queryFn: getAdminSettings });
      setToken('');
      setMessage('连接设置已验证并保存');
    } catch (error) {
      setMessage(humanizeApiError(error));
      setMessageError(true);
    } finally {
      setSaving(false);
    }
  }

  async function toggleBiometric(value: boolean) {
    if (Platform.OS === 'web') return;
    if (value) {
      const [hardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
      if (!hardware || !enrolled) {
        Alert.alert('无法启用', '当前设备未配置 Face ID、Touch ID 或设备密码。');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: '确认启用生物识别锁', disableDeviceFallback: false });
      if (!result.success) return;
    }
    await setBiometricEnabled(value);
  }

  async function changeTheme(mode: ThemeMode) {
    try {
      await setThemeMode(mode);
      setMessage('主题设置已保存');
      setMessageError(false);
    } catch {
      setMessage('主题设置保存失败');
      setMessageError(true);
    }
  }

  const title = section === 'security' ? '安全设置' : section === 'system' ? '系统设置' : '安全与系统设置';
  const subtitle = section === 'security' ? '管理员 Token、连接地址与本地应用锁' : section === 'system' ? 'Hub 版本、应用版本、更新状态与主题' : '安全连接、系统版本与显示偏好';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || '--';
  const updatesEnabled = Constants.expoConfig?.updates?.enabled === true;

  return (
    <Page title={title} subtitle={subtitle} refreshing={versionQuery.isRefetching || settingsQuery.isRefetching} onRefresh={showSystem ? () => { void versionQuery.refetch(); void settingsQuery.refetch(); } : undefined}>
      {showSecurity ? (
        <>
          <SectionTitle title="管理连接" />
          <Card>
            <Detail label="当前面板地址" value={config.baseUrl} />
            <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 16 }} />
            <Text style={{ color: theme.subtext, fontSize: 12, marginBottom: 8 }}>更换管理员 Token（留空则保持现有凭据）</Text>
            <TextInput accessibilityLabel="replace-admin-token" value={token} onChangeText={setToken} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="admin-xxxxxxxx" placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 13 }} />
            <Text style={{ color: theme.faint, fontSize: 11, lineHeight: 17, marginTop: 9 }}>{config.adminApiKey ? '本机已配置管理员凭据，页面不会回显原值。' : '本机尚未保存管理员凭据。'}</Text>
          </Card>

          <SectionTitle title="高级连接" />
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '800' }}>允许覆盖面板地址</Text>
                <Text style={{ color: theme.subtext, fontSize: 11, lineHeight: 17, marginTop: 5 }}>仅用于灾备或测试；只允许 HTTPS，不允许模型 API 域名。</Text>
              </View>
              <Switch value={advanced} onValueChange={(value) => { setAdvanced(value); if (!value) setUrl(VEXLUNE_HUB_URL); }} trackColor={{ false: theme.muted, true: theme.primary }} />
            </View>
            {advanced ? <TextInput accessibilityLabel="advanced-hub-url" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} placeholder="https://hub.example.com" placeholderTextColor={theme.faint} style={{ marginTop: 14, color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 13 }} /> : null}
            {config.advancedUrlEnabled ? (
              <Pressable onPress={() => void restoreDefaultHubUrl().then(() => { setAdvanced(false); setUrl(VEXLUNE_HUB_URL); queryClient.clear(); })} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13 }}>
                <RotateCcw color={theme.primary} size={15} />
                <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>恢复 Hub Vexlune 默认地址</Text>
              </Pressable>
            ) : null}
          </Card>

          <SectionTitle title="本地应用锁" />
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: theme.successSoft, alignItems: 'center', justifyContent: 'center' }}><ShieldCheck color={theme.success} size={20} /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '800' }}>Face ID / Touch ID</Text>
                <Text style={{ color: theme.subtext, fontSize: 11, lineHeight: 17, marginTop: 4 }}>{Platform.OS === 'web' ? '仅原生 iOS/Android 可用' : '应用回到后台时自动锁定，允许设备密码回退'}</Text>
              </View>
              <Switch disabled={Platform.OS === 'web'} value={config.biometricEnabled} onValueChange={(value) => void toggleBiometric(value)} trackColor={{ false: theme.muted, true: theme.primary }} />
            </View>
          </Card>

          <Pressable disabled={saving} onPress={() => void save()} style={{ marginTop: 18, minHeight: 50, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: saving ? theme.muted : theme.primary }}>
            <Save color="#FFFFFF" size={17} />
            <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{saving ? '正在验证...' : '验证并保存'}</Text>
          </Pressable>
        </>
      ) : null}

      {showSystem ? (
        <>
          <SectionTitle title="Hub 系统状态" />
          <StateCard loading={versionQuery.isLoading || settingsQuery.isLoading} error={versionQuery.error || settingsQuery.error} onRetry={() => { void versionQuery.refetch(); void settingsQuery.refetch(); }} />
          {!versionQuery.isLoading && !settingsQuery.isLoading && !(versionQuery.error || settingsQuery.error) ? (
            <Card>
              <View style={{ gap: 14 }}>
                <Detail label="站点名称" value={settingsQuery.data?.site_name ? String(settingsQuery.data.site_name) : '--'} />
                <Detail label="Hub 版本" value={versionQuery.data?.version || '--'} />
                <Detail label="提交版本" value={versionQuery.data?.commit || '--'} />
                <Detail label="构建时间" value={displayDate(versionQuery.data?.build_time)} />
                <Detail label="运行时长" value={displayUptime(versionQuery.data?.uptime)} />
              </View>
            </Card>
          ) : null}

          <SectionTitle title="应用版本" />
          <Card>
            <View style={{ gap: 14 }}>
              <Detail label="应用" value={APP_NAME} />
              <Detail label="版本" value={`${APP_VERSION} (${buildNumber})`} />
              <Detail label="更新状态" value={updatesEnabled ? '当前构建启用 Expo Updates' : '当前构建未启用 OTA 更新'} />
            </View>
          </Card>

          <SectionTitle title="显示" />
          <Card>
            <Text style={{ color: theme.text, fontWeight: '800' }}>主题</Text>
            <Text style={{ color: theme.subtext, fontSize: 11, lineHeight: 17, marginTop: 5 }}>主题偏好保存在本机，不影响管理员凭据或服务端设置。</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              {([['light', '浅色'], ['dark', '深色'], ['system', '跟随系统']] as [ThemeMode, string][]).map(([mode, label]) => (
                <Pressable key={mode} onPress={() => void changeTheme(mode)} style={{ flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: appearance.mode === mode ? theme.primary : theme.cardRaised }}>
                  <Text style={{ color: appearance.mode === mode ? '#FFFFFF' : theme.subtext, fontSize: 12, fontWeight: '800' }}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </>
      ) : null}

      {message ? <Text style={{ color: messageError ? theme.danger : theme.success, fontSize: 13, lineHeight: 19, marginTop: 14 }}>{message}</Text> : null}
    </Page>
  );
}
