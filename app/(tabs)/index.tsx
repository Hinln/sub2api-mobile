import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Activity, AlertTriangle, Bell, ChevronRight, CircleCheck, CircleDollarSign, KeyRound, Layers3, Server, UsersRound } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Badge, Card, Page, SectionTitle, StateCard } from '@/src/components/ui';
import { formatOptionalNumber, formatOptionalTokenValue } from '@/src/lib/formatters';
import { getAdminSettings, getDashboardStats, getDashboardTrend, getSystemVersion, listAccounts, listRequestErrors } from '@/src/services/admin';
import { getAdminPaymentDashboard } from '@/src/services/admin-extended';
import { theme } from '@/src/theme';

function number(value?: number) {
  return typeof value === 'number' ? new Intl.NumberFormat('zh-CN').format(value) : '--';
}

function money(value?: number) {
  return typeof value === 'number' ? `$${value.toFixed(2)}` : '--';
}

function amounts(value?: Record<string, number>) {
  const entries = Object.entries(value ?? {}).filter(([, amount]) => typeof amount === 'number' && Number.isFinite(amount));
  if (!entries.length) return '--';
  return entries.map(([currency, amount]) => {
    try {
      return new Intl.NumberFormat('zh-CN', { style: 'currency', currency }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }).join(' · ');
}

function firstAmount(value?: Record<string, number>) {
  const entry = Object.entries(value ?? {}).find(([, amount]) => typeof amount === 'number' && Number.isFinite(amount));
  return entry?.[1] ?? null;
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

type HomeTrendMetric = 'requests' | 'tokens' | 'revenue';

function DashboardMetric({ icon: Icon, label, value, detail, tone = 'default' }: { icon: typeof Activity; label: string; value: string; detail: string; tone?: 'default' | 'success' | 'warning' }) {
  const color = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.text;
  const iconColor = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.primary;
  const iconBackground = tone === 'success' ? theme.successSoft : tone === 'warning' ? theme.warningSoft : theme.primarySoft;
  return <View style={{ width: '23%', minHeight: 123, backgroundColor: theme.card, borderRadius: 17, borderWidth: 1, borderColor: theme.border, padding: 10, shadowColor: '#7C95C7', shadowOpacity: 0.04, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}>
    <View style={{ width: 26, height: 26, borderRadius: 9, backgroundColor: iconBackground, alignItems: 'center', justifyContent: 'center' }}><Icon color={iconColor} size={14} /></View>
    <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.subtext, fontSize: 10, marginTop: 8 }}>{label}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={{ color, fontSize: 17, fontWeight: '900', marginTop: 5 }}>{value}</Text>
    <Text numberOfLines={2} style={{ color: theme.faint, fontSize: 9, lineHeight: 13, marginTop: 5 }}>{detail}</Text>
  </View>;
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
  const [trendMetric, setTrendMetric] = useState<HomeTrendMetric>('requests');
  const stats = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats, staleTime: 30_000 });
  const payment = useQuery({ queryKey: ['admin-payment-dashboard'], queryFn: getAdminPaymentDashboard, staleTime: 30_000 });
  const settings = useQuery({ queryKey: ['admin-settings'], queryFn: getAdminSettings, staleTime: 120_000 });
  const version = useQuery({ queryKey: ['system-version'], queryFn: getSystemVersion, staleTime: 300_000 });
  const accounts = useQuery({ queryKey: ['dashboard-accounts'], queryFn: () => listAccounts('', { page_size: 20 }), staleTime: 30_000 });
  const failures = useQuery({ queryKey: ['dashboard-failures'], queryFn: () => listRequestErrors({ page_size: 4, resolved: false }), staleTime: 30_000 });
  const range = { start_date: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10), granularity: 'day' as const };
  const trend = useQuery({ queryKey: ['dashboard-trend-home', range.start_date, range.end_date], queryFn: () => getDashboardTrend(range), staleTime: 30_000 });
  const refresh = () => { void stats.refetch(); void payment.refetch(); void settings.refetch(); void version.refetch(); void accounts.refetch(); void failures.refetch(); void trend.refetch(); };
  const data = stats.data;
  const paymentData = payment.data;
  const accountItems = accounts.data?.items ?? [];
  const loading = stats.isLoading || accounts.isLoading;
  const error = stats.error || accounts.error;
  const abnormal = data?.error_accounts ?? accountItems.filter((item) => item.status === 'error' || Boolean(item.error_message)).length;
  const trendValues = trendMetric === 'requests'
    ? (trend.data?.trend ?? []).map((point) => point.requests)
    : trendMetric === 'tokens'
      ? (trend.data?.trend ?? []).map((point) => point.total_tokens)
      : (paymentData?.daily_series ?? []).slice(-7).map((point) => firstAmount(point.amount) ?? 0);
  const trendTitle = trendMetric === 'requests' ? '请求量' : trendMetric === 'tokens' ? 'Token' : '充值实收';
  const trendUnit = trendMetric === 'requests' ? '次' : trendMetric === 'tokens' ? 'Token' : '支付金额';

  return <Page title="管理员控制台" subtitle={`${settings.data?.site_name || 'Vexlune Hub'} · ${version.data?.version || '版本信息读取中'}`} refreshing={[stats, payment, accounts, trend].some((query) => query.isRefetching)} onRefresh={refresh} right={<Pressable accessibilityLabel="refresh-dashboard" onPress={refresh} style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}><Activity color={theme.primary} size={18} /></Pressable>}>
    <StateCard loading={loading} error={error} onRetry={refresh} />
    {!loading && !error ? <>
      <SectionTitle title="今日概览" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }}>
        <DashboardMetric icon={Activity} label="请求量" value={number(data?.today_requests)} detail="今日服务请求" />
        <DashboardMetric icon={Layers3} label="今日 Token" value={formatOptionalTokenValue(data?.today_tokens)} detail="输入与输出总量" />
        <DashboardMetric icon={CircleDollarSign} label="充值实收" value={amounts(paymentData?.today_amount)} detail={payment.error ? '支付接口暂不可用' : `${formatOptionalNumber(paymentData?.today_count)} 笔订单`} tone="success" />
        <DashboardMetric icon={CircleDollarSign} label="余额消费" value={money(data?.today_actual_cost)} detail={data?.today_actual_cost === undefined ? '服务端未提供实际扣费' : '今日实际扣费'} tone="warning" />
        <DashboardMetric icon={Server} label="上游账号" value={number(data?.total_accounts)} detail={`可用 ${number(data?.normal_accounts)} · 异常 ${number(data?.error_accounts)}`} tone={abnormal ? 'warning' : 'success'} />
        <DashboardMetric icon={UsersRound} label="总用户" value={number(data?.total_users)} detail={`今日新增 ${number(data?.today_new_users)}`} />
        <DashboardMetric icon={UsersRound} label="活跃用户" value={number(data?.active_users)} detail="今日活跃用户" tone="success" />
        <DashboardMetric icon={CircleCheck} label="请求成功率" value={successRate(data)} detail={`失败 ${number(data?.today_failed_requests ?? (data?.today_requests !== undefined && data?.today_success_requests !== undefined ? data.today_requests - data.today_success_requests : undefined))}`} tone="success" />
      </View>

      <Card style={{ marginTop: 16 }}><View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 17, fontWeight: '900' }}>近 7 天趋势</Text><Text style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }}>{trendTitle} · 按服务端日统计展示</Text></View><Badge label={trendMetric === 'revenue' ? amounts(paymentData?.today_amount) : `${trendMetric === 'tokens' ? formatOptionalTokenValue(data?.today_tokens) : number(data?.today_requests)} ${trendUnit}`} tone="primary" /></View><View style={{ flexDirection: 'row', gap: 5, borderRadius: 14, backgroundColor: theme.cardRaised, borderWidth: 1, borderColor: theme.border, padding: 4, marginTop: 14 }}>{([['requests', '请求量'], ['tokens', 'Token'], ['revenue', '充值实收']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: trendMetric === value }} onPress={() => setTrendMetric(value)} style={{ flex: 1, alignItems: 'center', borderRadius: 10, backgroundColor: trendMetric === value ? theme.primary : 'transparent', paddingVertical: 8 }}><Text style={{ color: trendMetric === value ? '#FFFFFF' : theme.subtext, fontSize: 10, fontWeight: '900' }}>{label}</Text></Pressable>)}</View><View style={{ marginTop: 17 }}><TrendBars values={trendValues} /></View></Card>

      <SectionTitle title="服务状态" action={<Pressable onPress={() => router.push('/accounts')}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '900' }}>查看全部</Text></Pressable>} />
      <View style={{ gap: 9 }}>{accountItems.slice(0, 3).map((item) => <Pressable key={item.id} onPress={() => router.push(`/accounts/${item.id}`)}><Card style={{ paddingVertical: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}><View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: item.error_message ? theme.dangerSoft : theme.successSoft, alignItems: 'center', justifyContent: 'center' }}><Server color={item.error_message ? theme.danger : theme.success} size={18} /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: theme.text, fontWeight: '900' }}>{item.name}</Text><Text style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }}>{`${item.platform} · ${item.current_concurrency ?? 0}/${item.concurrency ?? '--'} 并发`}</Text></View><Badge label={item.error_message ? '异常' : item.schedulable === false ? '已停用' : '运行中'} tone={item.error_message ? 'danger' : item.schedulable === false ? 'muted' : 'success'} /><ChevronRight color={theme.faint} size={17} /></View></Card></Pressable>)}{!accountItems.length ? <Card><Text style={{ color: theme.subtext, textAlign: 'center' }}>暂无上游账号数据</Text></Card> : null}</View>

      <SectionTitle title="快捷操作" />
      <View style={{ flexDirection: 'row', gap: 8 }}><QuickAction icon={UsersRound} title="用户" subtitle="状态与权限" onPress={() => router.push('/users')} /><QuickAction icon={KeyRound} title="账号" subtitle="节点与凭据" onPress={() => router.push('/accounts')} /><QuickAction icon={Layers3} title="分组" subtitle="模型与倍率" onPress={() => router.push('/groups')} /><QuickAction icon={Bell} title="公告" subtitle="系统通知" tone="warning" onPress={() => router.push('/admin-announcements')} /></View>

      {failures.data?.items?.length ? <><SectionTitle title="最近需要处理" action={<Pressable onPress={() => router.push('/exceptions')}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '900' }}>查看全部</Text></Pressable>} /><View style={{ gap: 9 }}>{failures.data.items.map((item) => <Pressable key={item.id} onPress={() => router.push('/exceptions')}><Card style={{ paddingVertical: 12 }}><View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><AlertTriangle color={theme.danger} size={17} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: theme.text, fontWeight: '800' }}>{item.model || item.request_path || `Request #${item.id}`}</Text><Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }}>{item.message || `HTTP ${item.status_code ?? '--'}`}</Text></View><ChevronRight color={theme.faint} size={17} /></View></Card></Pressable>)}</View></> : null}
    </> : null}
  </Page>;
}
