import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, ChevronRight, CircleCheck, CircleDollarSign, KeyRound, Layers3, Megaphone, RefreshCw, Server, ShieldAlert, UsersRound } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Badge, Card, Page, StateCard } from '@/src/components/ui';
import { getAdminSettings, getDashboardStats, getDashboardTrend, getSystemVersion, listAccounts, listRequestErrors } from '@/src/services/admin';
import { theme } from '@/src/theme';

type TrendMetric = 'requests' | 'actual_cost';

type SparklineProps = {
  values: number[];
  color?: string;
};

function money(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? `$${value.toFixed(2)}` : '--';
}

function count(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('zh-CN').format(value) : '--';
}


function lastSevenDays() {
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
  return { start_date: start.toISOString().slice(0, 10), end_date: end.toISOString().slice(0, 10), granularity: 'day' as const };
}

function uptimeLabel(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '';
  const days = Math.floor(value / 86_400);
  if (days > 0) return `已连续运行 ${days} 天`;
  const hours = Math.floor(value / 3_600);
  return hours > 0 ? `已连续运行 ${hours} 小时` : '刚刚启动';
}

function Sparkline({ values, color = theme.primary }: SparklineProps) {
  const finite = values.filter((value) => Number.isFinite(value) && value >= 0);
  const max = Math.max(...finite, 1);
  if (!finite.length) return <View style={{ height: 27 }} />;
  return <View accessibilityLabel="metric-sparkline" style={{ height: 27, flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 8 }}>
    {finite.slice(-8).map((value, index) => <View key={`${value}-${index}`} style={{ flex: 1, minHeight: 3, height: `${Math.max(10, (value / max) * 100)}%`, borderRadius: 4, backgroundColor: color, opacity: index === finite.slice(-8).length - 1 ? 1 : 0.35 }} />)}
  </View>;
}

function KpiCard({ icon: Icon, label, value, trend, tone = 'primary', values }: { icon: typeof Activity; label: string; value: string; trend?: string; tone?: 'primary' | 'success' | 'warning' | 'danger'; values?: number[] }) {
  const palette = tone === 'success' ? { icon: theme.success, soft: theme.successSoft } : tone === 'warning' ? { icon: theme.warning, soft: theme.warningSoft } : tone === 'danger' ? { icon: theme.danger, soft: theme.dangerSoft } : { icon: theme.primary, soft: theme.primarySoft };
  const rising = trend?.startsWith('+');
  const falling = trend?.startsWith('-');
  return <Card style={{ flex: 1, minWidth: 0, padding: 12 }}>
    <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: palette.soft, alignItems: 'center', justifyContent: 'center' }}><Icon color={palette.icon} size={17} /></View>
    <Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 11, marginTop: 9 }}>{label}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.text, fontSize: 18, fontWeight: '900', marginTop: 4 }}>{value}</Text>
    {trend ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 5 }}>{rising ? <ArrowUpRight color={theme.success} size={12} /> : falling ? <ArrowDownRight color={theme.danger} size={12} /> : null}<Text style={{ color: rising ? theme.success : falling ? theme.danger : theme.faint, fontSize: 10, fontWeight: '800' }}>{trend}</Text></View> : null}
    <Sparkline values={values ?? []} color={palette.icon} />
  </Card>;
}

function QuickAction({ icon: Icon, title, subtitle, onPress, tone = 'primary' }: { icon: typeof Activity; title: string; subtitle: string; onPress: () => void; tone?: 'primary' | 'warning' | 'danger' }) {
  const palette = tone === 'danger' ? { icon: theme.danger, soft: theme.dangerSoft } : tone === 'warning' ? { icon: theme.warning, soft: theme.warningSoft } : { icon: theme.primary, soft: theme.primarySoft };
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flex: 1, minWidth: 0, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: pressed ? palette.soft : theme.card, padding: 10, opacity: pressed ? 0.85 : 1 })}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: palette.soft, alignItems: 'center', justifyContent: 'center' }}><Icon color={palette.icon} size={16} /></View><ChevronRight color={theme.faint} size={16} /></View>
    <Text numberOfLines={1} style={{ color: theme.text, fontSize: 13, fontWeight: '900', marginTop: 10 }}>{title}</Text>
    <Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 10, marginTop: 4 }}>{subtitle}</Text>
  </Pressable>;
}

function SectionHeader({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children?: ReactNode }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 }}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>{title}</Text>{children}</View>{action ? onAction ? <Pressable onPress={onAction}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>{action}</Text></Pressable> : <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>{action}</Text> : null}</View>;
}

export default function MonitorScreen() {
  const range = useMemo(() => lastSevenDays(), []);
  const stats = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats, staleTime: 30_000 });
  const settings = useQuery({ queryKey: ['admin-settings'], queryFn: getAdminSettings, staleTime: 120_000 });
  const version = useQuery({ queryKey: ['system-version'], queryFn: getSystemVersion, staleTime: 300_000 });
  const accounts = useQuery({ queryKey: ['dashboard-accounts'], queryFn: () => listAccounts('', { page_size: 50 }), staleTime: 30_000 });
  const trend = useQuery({ queryKey: ['dashboard-trend-7d'], queryFn: () => getDashboardTrend(range), staleTime: 30_000 });
  const failures = useQuery({ queryKey: ['dashboard-failures'], queryFn: () => listRequestErrors({ page_size: 5, resolved: false }), staleTime: 30_000 });
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('requests');

  const queries = [stats, settings, version, accounts, trend, failures];
  const loading = stats.isLoading || accounts.isLoading;
  const error = stats.error || accounts.error;
  const refreshing = queries.some((query) => query.isRefetching);
  const refresh = () => { queries.forEach((query) => void query.refetch()); };
  const accountItems = accounts.data?.items ?? [];
  const totalAccounts = stats.data?.total_accounts ?? accounts.data?.total ?? 0;
  const availableAccounts = stats.data?.normal_accounts ?? accountItems.filter((item) => item.status !== 'error' && item.schedulable !== false).length;
  const abnormal = stats.data?.error_accounts ?? accountItems.filter((item) => item.status === 'error' || Boolean(item.error_message)).length;
  const trendItems = trend.data?.trend ?? [];
  const trendValues = trendItems.map((point) => {
    const value = trendMetric === 'requests' ? point.requests : point.actual_cost;
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  });
  const trendMax = Math.max(...trendValues, 1);
  const trendLatest = trendValues.length ? trendValues[trendValues.length - 1] : undefined;
  const trendFirst = trendValues.find((value) => value > 0);
  const trendDelta = typeof trendLatest === 'number' && typeof trendFirst === 'number' && trendFirst > 0 ? `${((trendLatest - trendFirst) / trendFirst * 100 >= 0 ? '+' : '')}${((trendLatest - trendFirst) / trendFirst * 100).toFixed(1)}%` : '--';
  const accountTrend = accountItems.map((item) => item.current_concurrency ?? 0);

  return <Page title="运营概览" subtitle={`${settings.data?.site_name || 'Vexlune Hub'} · ${version.data?.version || '版本未知'}`} refreshing={refreshing} onRefresh={refresh} right={<Pressable accessibilityLabel="refresh-dashboard" onPress={refresh} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: theme.cardRaised, alignItems: 'center', justifyContent: 'center' }}><RefreshCw color={theme.primary} size={19} /></Pressable>}>
    <StateCard loading={loading} error={error} onRetry={refresh} />
    {!loading && !error ? <>
      <Card style={{ paddingVertical: 15 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}><View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: theme.successSoft, alignItems: 'center', justifyContent: 'center' }}><CircleCheck color={theme.success} size={19} /></View><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '900' }}>Hub 服务状态</Text><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>{uptimeLabel(version.data?.uptime) || `最近刷新于 ${new Date().toLocaleTimeString('zh-CN')}`}</Text></View><Badge label="ONLINE" tone="success" /><ChevronRight color={theme.faint} size={17} /></View>
        {abnormal > 0 ? <Pressable onPress={() => router.push('/exceptions')} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border }}><AlertTriangle color={theme.danger} size={15} /><Text style={{ flex: 1, color: theme.danger, fontSize: 12, fontWeight: '700' }}>{`${abnormal} 个上游账号需要处理`}</Text><Text style={{ color: theme.danger, fontSize: 12, fontWeight: '800' }}>查看异常</Text><ChevronRight color={theme.danger} size={15} /></Pressable> : null}
      </Card>

      <SectionHeader title="今日核心指标" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <KpiCard icon={Server} label="在线节点" value={`${count(availableAccounts)} / ${count(totalAccounts)}`} tone="success" values={accountTrend} />
        <KpiCard icon={Activity} label="请求 / 分钟" value={count(stats.data?.rpm)} trend={trendDelta} values={trendItems.map((point) => point.requests)} />
        <KpiCard icon={Layers3} label="Token / 分钟" value={count(stats.data?.tpm)} tone="warning" />
      </View>

      <SectionHeader title="近 7 天趋势" action={trendDelta === '--' ? undefined : `${trendDelta} · ${trendMetric === 'requests' ? '请求量' : '实际计费'}`} />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {([['requests', '请求量'], ['actual_cost', '实际计费']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setTrendMetric(value)} style={{ borderRadius: 999, backgroundColor: trendMetric === value ? theme.primary : theme.cardRaised, paddingHorizontal: 12, paddingVertical: 7 }}><Text style={{ color: trendMetric === value ? '#FFFFFF' : theme.subtext, fontSize: 11, fontWeight: '800' }}>{label}</Text></Pressable>)}
          </View>
          <Text style={{ color: theme.subtext, fontSize: 11 }}>{range.start_date.slice(5)}–{range.end_date.slice(5)}</Text>
        </View>
        {trendValues.length ? <View style={{ height: 128, flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginTop: 18 }}>{trendValues.map((value, index) => <View key={`${trend.data?.trend[index]?.date ?? index}`} accessibilityLabel={`trend-${index}`} style={{ flex: 1, minHeight: 4, height: `${Math.max(5, (value / trendMax) * 100)}%`, borderRadius: 4, backgroundColor: index === trendValues.length - 1 ? theme.primary : theme.primarySoft }} />)}</View> : <Text style={{ color: theme.subtext, textAlign: 'center', paddingVertical: 28 }}>当前时间范围没有趋势数据</Text>}
        {trendLatest !== undefined ? <Text style={{ color: theme.text, fontSize: 12, fontWeight: '800', marginTop: 11 }}>{trendMetric === 'requests' ? `${count(trendLatest)} 次请求` : money(trendLatest)}</Text> : null}
      </Card>

      <SectionHeader title="服务状态" action="查看全部" onAction={() => router.push('/accounts')} />
      <Card>
        <View style={{ gap: 10 }}>{accountItems.slice(0, 4).map((account) => {
          const unhealthy = account.status === 'error' || account.schedulable === false || Boolean(account.error_message);
          return <Pressable key={account.id} onPress={() => router.push(`/accounts/${account.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 }}><View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: unhealthy ? theme.warningSoft : theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}><KeyRound color={unhealthy ? theme.warning : theme.primary} size={16} /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: theme.text, fontSize: 13, fontWeight: '900' }}>{account.name}</Text><Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 11, marginTop: 3 }}>{`${account.platform} · 并发 ${account.current_concurrency ?? 0}/${account.concurrency ?? '--'}`}</Text></View><Badge label={unhealthy ? '需处理' : '运行中'} tone={unhealthy ? 'warning' : 'success'} /><ChevronRight color={theme.faint} size={16} /></Pressable>;
        })}</View>
        <Pressable onPress={() => router.push('/accounts')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: theme.border }}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>管理上游账号</Text><ChevronRight color={theme.primary} size={15} /></Pressable>
      </Card>

      <SectionHeader title="快捷操作" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <QuickAction icon={UsersRound} title="用户" subtitle="用户与权限" onPress={() => router.push('/users')} />
        <QuickAction icon={Layers3} title="分组" subtitle="倍率与限制" onPress={() => router.push('/groups')} />
        <QuickAction icon={CircleDollarSign} title="订单" subtitle="履约与退款" tone="warning" onPress={() => router.push('/admin-orders')} />
        <QuickAction icon={Megaphone} title="公告" subtitle="系统通知" onPress={() => router.push('/admin-announcements')} />
      </View>

      <SectionHeader title="最近活动" action={failures.data?.items.length ? '查看异常' : undefined} onAction={() => router.push('/exceptions')} />
      <View style={{ gap: 8 }}>{(failures.data?.items ?? []).length ? failures.data!.items.map((item) => <Pressable key={item.id} onPress={() => router.push('/exceptions')}><Card style={{ paddingVertical: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 31, height: 31, borderRadius: 10, backgroundColor: theme.dangerSoft, alignItems: 'center', justifyContent: 'center' }}><ShieldAlert color={theme.danger} size={16} /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: theme.text, fontSize: 12, fontWeight: '800' }}>{item.model || item.request_path || `Request #${item.id}`}</Text><Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 11, marginTop: 3 }}>{item.message || `HTTP ${item.status_code ?? '--'}`}</Text></View><Badge label={String(item.status_code ?? 'ERR')} tone="danger" /><ChevronRight color={theme.faint} size={15} /></View></Card></Pressable>) : <Card><View style={{ alignItems: 'center', paddingVertical: 8 }}><Bell color={theme.success} size={19} /><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 8 }}>暂无待处理异常</Text></View></Card>}</View>
    </> : null}
  </Page>;
}
