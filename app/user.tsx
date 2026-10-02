import { Redirect, router } from 'expo-router';
import { Bell, CreditCard, KeyRound, LogOut, RefreshCw, ShieldCheck, Activity } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { adminConfigState, logoutAdminAccount } from '@/src/store/admin-config';
import { logoutRemote } from '@/src/services/auth';
import { getUsageStats, getUserDashboardSnapshot, getUserProfile, listUserAnnouncements, listUserApiKeys } from '@/src/services/user';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { formatOptionalMoney, formatOptionalNumber } from '@/src/lib/formatters';
import { queryClient } from '@/src/lib/query-client';
import { theme } from '@/src/theme';
import { isAdmin } from '@/src/auth/session';

// CommonJS entry avoids import.meta in Expo Metro's classic web bundle.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useSnapshot } = require('valtio/react');

export default function UserWorkspace() {
  const config = useSnapshot(adminConfigState);
  const [refreshing, setRefreshing] = useState(false);
  const profile = useQuery({ queryKey: ['user-profile'], queryFn: getUserProfile, enabled: Boolean(config.accessToken) });
  const snapshot = useQuery({ queryKey: ['user-dashboard-snapshot'], queryFn: getUserDashboardSnapshot, enabled: Boolean(config.accessToken) });
  const usageStats = useQuery({ queryKey: ['user-dashboard-usage-stats'], queryFn: () => getUsageStats({ period: 'month' }), enabled: Boolean(config.accessToken) });
  const keys = useQuery({ queryKey: ['user-api-keys'], queryFn: () => listUserApiKeys(), enabled: Boolean(config.accessToken) });
  const announcements = useQuery({ queryKey: ['user-announcements'], queryFn: listUserAnnouncements, enabled: Boolean(config.accessToken) });

  if (!config.accessToken || !config.user) return <Redirect href="/login" />;
  if (isAdmin(config.user)) return <Redirect href="/monitor" />;

  async function refresh() { setRefreshing(true); await Promise.all([queryClient.invalidateQueries({ queryKey: ['user-profile'] }), queryClient.invalidateQueries({ queryKey: ['user-dashboard-snapshot'] }), queryClient.invalidateQueries({ queryKey: ['user-dashboard-usage-stats'] }), queryClient.invalidateQueries({ queryKey: ['user-api-keys'] }), queryClient.invalidateQueries({ queryKey: ['user-announcements'] })]); setRefreshing(false); }
  function signOut() { Alert.alert('退出登录', '将撤销当前会话并清除本机凭据。', [{ text: '取消', style: 'cancel' }, { text: '退出', style: 'destructive', onPress: () => void logoutRemote().catch(() => undefined).finally(async () => { await logoutAdminAccount(); queryClient.clear(); router.replace('/login'); }) }]); }

  const error = profile.error || snapshot.error || usageStats.error || keys.error || announcements.error;
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }}><ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={theme.primary} />}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View><Text style={{ color: theme.text, fontSize: 27, fontWeight: '900' }}>Vexlune Hub</Text><Text style={{ color: theme.subtext, marginTop: 4 }}>个人工作台</Text></View><Pressable accessibilityRole="button" accessibilityLabel="logout" onPress={signOut} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' }}><LogOut color={theme.subtext} size={19} /></Pressable></View>
    {error ? <View style={{ padding: 14, borderRadius: 16, backgroundColor: theme.dangerSoft }}><Text style={{ color: theme.danger, lineHeight: 20 }}>{humanizeApiError(error)}</Text></View> : null}
    <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 20, padding: 17 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}><ShieldCheck color={theme.primary} size={19} /></View><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '900' }}>{profile.data?.username || profile.data?.email || config.user?.email || '当前用户'}</Text><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 3 }}>{profile.data?.email || config.user?.email}</Text></View></View><View style={{ height: 1, backgroundColor: theme.border, marginVertical: 15 }} /><Text style={{ color: theme.faint, fontSize: 11 }}>账户余额</Text><Text style={{ color: theme.text, fontSize: 26, fontWeight: '900', marginTop: 4 }}>{typeof profile.data?.balance === 'number' ? profile.data.balance.toFixed(2) : '—'}</Text></View>
    <View style={{ flexDirection: 'row', gap: 12 }}><SummaryCard icon={<KeyRound color={theme.primary} size={17} />} label="API 密钥" value={keys.isLoading ? '…' : formatOptionalNumber(keys.data?.total ?? keys.data?.items?.length)} onPress={() => router.push('/user-keys')} /><SummaryCard icon={<Bell color={theme.primary} size={17} />} label="未读公告" value={announcements.isLoading ? '…' : String((announcements.data ?? []).filter((item) => !item.read_at).length)} onPress={() => router.push('/user-announcements')} /></View>
    <View style={{ flexDirection: 'row', gap: 12 }}><SummaryCard icon={<Activity color={theme.primary} size={17} />} label="近 30 天请求" value={usageStats.isLoading ? '…' : formatOptionalNumber(usageStats.data?.total_requests ?? usageStats.data?.requests)} onPress={() => router.push('/user-usage')} /><SummaryCard icon={<CreditCard color={theme.primary} size={17} />} label="订阅与订单" value="查看" onPress={() => router.push('/user-billing')} /></View>
    <View style={{ backgroundColor: theme.card, borderRadius: 18, borderColor: theme.border, borderWidth: 1, padding: 16 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.text, fontWeight: '900' }}>近 30 天使用情况</Text><Pressable accessibilityLabel="refresh-dashboard" onPress={() => void refresh()}><RefreshCw color={theme.primary} size={16} /></Pressable></View><Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 19, marginTop: 9 }}>{usageStats.isLoading ? '正在从服务端加载...' : `请求 ${formatOptionalNumber(usageStats.data?.total_requests ?? usageStats.data?.requests)} · Token ${formatOptionalNumber(usageStats.data?.total_tokens ?? usageStats.data?.tokens)} · 费用 ${formatOptionalMoney(usageStats.data?.total_cost ?? usageStats.data?.cost)}`}</Text></View>
    <Pressable onPress={() => void refresh()} style={{ minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.primary, fontWeight: '900' }}>刷新服务端数据</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

function SummaryCard({ icon, label, value, onPress }: { icon: React.ReactNode; label: string; value: string; onPress: () => void }) { return <Pressable onPress={onPress} style={{ flex: 1, backgroundColor: theme.card, borderRadius: 18, borderColor: theme.border, borderWidth: 1, padding: 16 }}><View style={{ width: 31, height: 31, borderRadius: 10, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>{icon}</View><Text style={{ color: theme.faint, fontSize: 11, marginTop: 10 }}>{label}</Text><Text style={{ color: theme.text, fontSize: 22, fontWeight: '900', marginTop: 5 }}>{value}</Text></Pressable>; }
