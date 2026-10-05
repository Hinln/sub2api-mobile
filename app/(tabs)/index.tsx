import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Activity, AlertTriangle, Bell, ChevronRight, CircleCheck, CircleDollarSign, KeyRound, Layers3, Server, UsersRound } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Badge, Card, Metric, Page, SectionTitle, StateCard } from '@/src/components/ui';
import { formatTokenValue } from '@/src/lib/formatters';
import { getAdminSettings, getDashboardStats, getDashboardTrend, getSystemVersion, listAccounts, listRequestErrors } from '@/src/services/admin';
import { theme } from '@/src/theme';

function number(value?: number) {
  return typeof value === 'number' ? new Intl.NumberFormat('zh-CN').format(value) : '--';
}

function money(value?: number) {
  return typeof value === 'number' ? `$${value.toFixed(2)}` : '--';
}

function successRate(stats?: { today_requests?: number; today_success_requests?: number; today_failed_requests?: number }) {
  if (!stats?.today_requests) return '--';
  const successful = stats.today_success_requests ?? Math.max(0, stats.today_requests - (stats.today_failed_requests ?? 0));
  return `${Math.max(0, Math.min(100, (successful / stats.today_requests) * 100)).toFixed(1)}%`;
}

function TrendBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  if (!values.length) return <Text style={{ color: theme.subtext, textAlign: 'center', paddingVertical: 22 }}>当前时间范围没有趋势数据</Text>;
  return <View accessibilityLabel="dashboard-trend" style={{ height: 116, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>{values.slice(-24).map((value, index, current) => <View key={`${index}-${value}`} style={{ flex: 1, minHeight: 4, height: `${Math.max(5, (value / max) * 100)}%`, borderRadius: 5, backgroundColor: index === current.length - 1 ? theme.primary : theme.primarySoft }} />)}</View>;
}

function QuickAction({ icon: Icon, title, subtitle, onPress, tone = 'primary' }: { icon: typeof UsersRound; title: string; subtitle: string; onPress: () => void; tone?: 'primary' | 'success' | 'warning' }) {
  const color = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.primary;
  const background = tone === 'success' ? theme.successSoft : tone === 'warning' ? theme.warningSoft : theme.primarySoft;
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flex: 1, minWidth: 0, borderRadius: 18, backgroundColor: pressed ? theme.muted : theme.card, borderWidth: 1, borderColor: theme.border, padding: 10, opacity: pressed ? 0.86 : 1 })}>
    <View style={{ width: 30, height: 30, borderRadius: 11, backgroundColor: background, alignItems: 'center', justifyContent: 'center' }}><Icon color={color} size={15} /></View>
    <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.text, fontSize: 11, fontWeight: '900', marginTop: 8 }}>{title}</Text>
    <Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 9, lineHeight: 13, marginTop: 3 }}>{subtitle}</Text>
  </Pressable>;
}

export default function HomeScreen() {
  const stats = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats, staleTime: 30_000 });
  const settings = useQuery({ queryKey: ['admin-settings'], queryFn: getAdminSettings, staleTime: 120_000 });
  const version = useQuery({ queryKey: ['system-version'], queryFn: getSystemVersion, staleTime: 300_000 });
  const accounts = useQuery({ queryKey: ['dashboard-accounts'], queryFn: () => listAccounts('', { page_size: 20 }), staleTime: 30_000 });
  const failures = useQuery({ queryKey: ['dashboard-failures'], queryFn: () => listRequestErrors({ page_size: 4, resolved: false }), staleTime: 30_000 });
  const range = { start_date: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10), granularity: 'day' as const };
  const trend = useQuery({ queryKey: ['dashboard-trend-home', range.start_date, range.end_date], queryFn: () => getDashboardTrend(range), staleTime: 30_000 });
  const refresh = () => { void stats.refetch(); void settings.refetch(); void version.refetch(); void accounts.refetch(); void failures.refetch(); void trend.refetch(); };
  const data = stats.data;
  const accountItems = accounts.data?.items ?? [];
  const abnormal = accountItems.filter((item) => item.status === 'error' || Boolean(item.error_message)).length;
  const loading = stats.isLoading || accounts.isLoading;
  const error = stats.error || accounts.error;

  return <Page title="管理员控制台" subtitle={`${settings.data?.site_name || 'Vexlune Hub'} · ${version.data?.version || '版本信息读取中'}`} refreshing={[stats, accounts, trend].some((query) => query.isRefetching)} onRefresh={refresh} right={<Pressable accessibilityLabel="refresh-dashboard" onPress={refresh} style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}><Activity color={theme.primary} size={18} /></Pressable>}>
    <StateCard loading={loading} error={error} onRetry={refresh} />
    {!loading && !error ? <>
      <Card style={{ paddingVertical: 14, backgroundColor: theme.card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}><View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: abnormal ? theme.warningSoft : theme.successSoft, alignItems: 'center', justifyContent: 'center' }}>{abnormal ? <AlertTriangle color={theme.warning} size={19} /> : <CircleCheck color={theme.success} size={19} />}</View><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 14, fontWeight: '900' }}>{abnormal ? `${abnormal} 个上游账号需要关注` : '服务运行正常'}</Text><Text style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }}>数据来自当前 Hub 管理接口</Text></View><Badge label={abnormal ? '需关注' : '在线'} tone={abnormal ? 'warning' : 'success'} /></View>
      </Card>

      <SectionTitle title="今日概览" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Metric icon={Activity} label="请求量" value={number(data?.today_requests)} />
        <Metric icon={UsersRound} label="活跃用户" value={number(data?.active_users)} tone="success" />
        <Metric icon={CircleDollarSign} label="实际费用" value={money(data?.today_actual_cost)} tone="warning" />
        <Metric icon={CircleCheck} label="成功率" value={successRate(data)} tone="success" />
      </View>

      <Card style={{ marginTop: 16 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View><Text style={{ color: theme.text, fontSize: 17, fontWeight: '900' }}>近 7 天请求趋势</Text><Text style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }}>按服务端日统计展示</Text></View><Badge label={`${formatTokenValue(data?.today_tokens ?? 0)} Token`} tone="primary" /></View><View style={{ marginTop: 17 }}><TrendBars values={(trend.data?.trend ?? []).map((point) => point.requests)} /></View></Card>

      <SectionTitle title="服务状态" action={<Pressable onPress={() => router.push('/accounts')}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '900' }}>查看全部</Text></Pressable>} />
      <View style={{ gap: 9 }}>{accountItems.slice(0, 3).map((item) => <Pressable key={item.id} onPress={() => router.push(`/accounts/${item.id}`)}><Card style={{ paddingVertical: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}><View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: item.error_message ? theme.dangerSoft : theme.successSoft, alignItems: 'center', justifyContent: 'center' }}><Server color={item.error_message ? theme.danger : theme.success} size={18} /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: theme.text, fontWeight: '900' }}>{item.name}</Text><Text style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }}>{`${item.platform} · ${item.current_concurrency ?? 0}/${item.concurrency ?? '--'} 并发`}</Text></View><Badge label={item.error_message ? '异常' : item.schedulable === false ? '已停用' : '运行中'} tone={item.error_message ? 'danger' : item.schedulable === false ? 'muted' : 'success'} /><ChevronRight color={theme.faint} size={17} /></View></Card></Pressable>)}{!accountItems.length ? <Card><Text style={{ color: theme.subtext, textAlign: 'center' }}>暂无上游账号数据</Text></Card> : null}</View>

      <SectionTitle title="快捷操作" />
      <View style={{ flexDirection: 'row', gap: 8 }}><QuickAction icon={UsersRound} title="用户" subtitle="状态与权限" onPress={() => router.push('/users')} /><QuickAction icon={KeyRound} title="账号" subtitle="节点与凭据" onPress={() => router.push('/accounts')} /><QuickAction icon={Layers3} title="分组" subtitle="模型与倍率" onPress={() => router.push('/groups')} /><QuickAction icon={Bell} title="公告" subtitle="系统通知" tone="warning" onPress={() => router.push('/admin-announcements')} /></View>

      {failures.data?.items?.length ? <><SectionTitle title="最近需要处理" action={<Pressable onPress={() => router.push('/exceptions')}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '900' }}>查看全部</Text></Pressable>} /><View style={{ gap: 9 }}>{failures.data.items.map((item) => <Pressable key={item.id} onPress={() => router.push('/exceptions')}><Card style={{ paddingVertical: 12 }}><View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><AlertTriangle color={theme.danger} size={17} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: theme.text, fontWeight: '800' }}>{item.model || item.request_path || `Request #${item.id}`}</Text><Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }}>{item.message || `HTTP ${item.status_code ?? '--'}`}</Text></View><ChevronRight color={theme.faint} size={17} /></View></Card></Pressable>)}</View></> : null}
    </> : null}
  </Page>;
}
