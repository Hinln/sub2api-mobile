import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { Bell, FileText, Globe2, LockKeyhole, RotateCcw, Save, Settings2, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, Pressable, Switch, Text, TextInput, View } from 'react-native';

import { Card, MenuRow, Page, SectionTitle } from '@/src/components/ui';
import { normalizeHubUrl, VEXLUNE_HUB_URL } from '@/src/config/vexlune';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { queryClient } from '@/src/lib/query-client';
import { getAdminSettings } from '@/src/services/admin';
import { adminConfigState, restoreDefaultHubUrl, setBaseUrl, setBiometricEnabled } from '@/src/store/admin-config';
import { setThemeMode, theme, themePreferences, type ThemeMode } from '@/src/theme';

// CommonJS entry avoids import.meta handling in Expo Metro's classic web bundle.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useSnapshot } = require('valtio/react');

export default function SettingsScreen() {
  const config = useSnapshot(adminConfigState);
  const appearance = useSnapshot(themePreferences);
  const [advanced, setAdvanced] = useState(config.baseUrl !== VEXLUNE_HUB_URL);
  const [url, setUrl] = useState(config.baseUrl);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const baseUrl = advanced ? normalizeHubUrl(url) : VEXLUNE_HUB_URL;
      await setBaseUrl(baseUrl);
      queryClient.clear();
      await queryClient.fetchQuery({ queryKey: ['admin-settings'], queryFn: getAdminSettings });
      setMessage('连接设置已验证并保存');
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
    } catch {
      setMessage('主题设置保存失败');
    }
  }

  return (
    <Page title="系统设置" subtitle="站点配置 · 安全管理 · 通知策略">
      <SectionTitle title="站点配置" />
      <Card>
        <MenuRow icon={Settings2} title="站点信息" subtitle="基础信息与站点功能设置" onPress={() => setAdvanced(true)} />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <MenuRow icon={Globe2} title="管理连接" subtitle={config.baseUrl} onPress={() => setAdvanced(true)} />
      </Card>

      <SectionTitle title="安全设置" />
      <Card>
        <MenuRow icon={LockKeyhole} title="审计与告警" subtitle="查看管理员操作记录与风险事件" onPress={() => router.push('/admin-security')} />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
          <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: theme.successSoft, alignItems: 'center', justifyContent: 'center' }}><ShieldCheck color={theme.success} size={19} /></View>
          <View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>Face ID / Touch ID</Text><Text style={{ color: theme.subtext, fontSize: 11, lineHeight: 17, marginTop: 4 }}>{Platform.OS === 'web' ? '仅原生 iOS 可用' : '返回后台时保护管理端'}</Text></View>
          <Switch disabled={Platform.OS === 'web'} value={config.biometricEnabled} onValueChange={(value) => void toggleBiometric(value)} trackColor={{ false: theme.muted, true: theme.primary }} />
        </View>
      </Card>

      <SectionTitle title="通知设置" />
      <Card>
        <MenuRow icon={Bell} title="公告管理" subtitle="发布和管理站点公告" onPress={() => router.push('/admin-announcements')} />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <MenuRow icon={FileText} title="运行日志" subtitle="请求、异常和服务状态记录" onPress={() => router.push('/logs')} />
      </Card>

      <SectionTitle title="连接高级设置" />
      <Card>
        <Text style={{ color: theme.faint, fontSize: 11 }}>当前面板地址</Text>
        <Text selectable style={{ color: theme.text, fontSize: 14, marginTop: 6 }}>{config.baseUrl}</Text>
        <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 16 }} />
        <Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 18 }}>当前使用官方 Sub2API Admin Key，通过 HTTPS 的 x-api-key 请求头访问管理接口；密钥只保存在系统安全存储。</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 }}>
          <View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>允许覆盖面板地址</Text><Text style={{ color: theme.subtext, fontSize: 11, lineHeight: 17, marginTop: 5 }}>仅用于灾备或测试；只允许 HTTPS。</Text></View>
          <Switch value={advanced} onValueChange={(value) => { setAdvanced(value); if (!value) setUrl(VEXLUNE_HUB_URL); }} trackColor={{ false: theme.muted, true: theme.primary }} />
        </View>
        {advanced ? <TextInput accessibilityLabel="advanced-hub-url" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} placeholder="https://hub.example.com" placeholderTextColor={theme.faint} style={{ marginTop: 14, color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 13 }} /> : null}
        {config.baseUrl !== VEXLUNE_HUB_URL ? <Pressable onPress={() => void restoreDefaultHubUrl().then(() => { setAdvanced(false); setUrl(VEXLUNE_HUB_URL); queryClient.clear(); })} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13 }}><RotateCcw color={theme.primary} size={15} /><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>恢复 Vexlune 默认地址</Text></Pressable> : null}
      </Card>

      <SectionTitle title="显示" />
      <Card>
        <Text style={{ color: theme.text, fontWeight: '800' }}>主题</Text>
        <Text style={{ color: theme.subtext, fontSize: 11, lineHeight: 17, marginTop: 5 }}>默认使用浅色界面；主题选择会保存在本机。</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>{([['light', '浅色'], ['dark', '深色'], ['system', '跟随系统']] as [ThemeMode, string][]).map(([mode, label]) => <Pressable key={mode} onPress={() => void changeTheme(mode)} style={{ flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: appearance.mode === mode ? theme.primary : theme.cardRaised }}><Text style={{ color: appearance.mode === mode ? '#FFFFFF' : theme.subtext, fontSize: 12, fontWeight: '800' }}>{label}</Text></Pressable>)}</View>
      </Card>

      {message ? <Text style={{ color: message.includes('已验证') || message.includes('已保存') ? theme.success : theme.danger, fontSize: 13, lineHeight: 19, marginTop: 14 }}>{message}</Text> : null}
      <Pressable disabled={saving} onPress={() => void save()} style={{ marginTop: 18, minHeight: 50, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: saving ? theme.muted : theme.primary }}><Save color="#FFFFFF" size={17} /><Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{saving ? '正在验证...' : '验证并保存连接'}</Text></Pressable>
    </Page>
  );
}
