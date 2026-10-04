import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, ChevronDown, ChevronRight, ChevronUp, CircleCheck, RefreshCw } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Badge, Card, Metric, Page, SectionTitle, StateCard } from '@/src/components/ui';
import { formatTokenValue } from '@/src/lib/formatters';
import { getAdminSettings, getDashboardStats, getDashboardTrend, getSystemVersion, listAccounts, listRequestErrors } from '@/src/services/admin';
import { theme } from '@/src/theme';

function money(value?: number) { return typeof value === 'number' ? `$${value.toFixed(2)}` : '--'; }
function count(value?: number) { return typeof value === 'number' ? new Intl.NumberFormat('zh-CN').format(value) : '--'; }
function successRate(stats?: { today_requests?: number; today_success_requests?: number; today_failed_requests?: number }) {
  if (!stats || !Number.isFinite(stats.today_requests) || !stats.today_requests) return '--';
  const success = stats.today_success_requests ?? (typeof stats.today_failed_requests === 'number' ? stats.today_requests - stats.today_failed_requests : undefined);
  return typeof success === 'number' ? `${Math.max(0, Math.min(100, (success / stats.today_requests) * 100)).toFixed(1)}%` : '--';
}

function last24Hours() {
  const end = new Date();
  const start = new Date(end.getTime() - 23 * 60 * 60 * 1000);
  return { start_date: start.toISOString().slice(0, 10), end_date: end.toISOString().slice(0, 10), granularity: 'hour' as const };
}

function Disclosure({ title, summary, open, onPress, children }: { title: string; summary: string; open: boolean; onPress: () => void; children: ReactNode }) {
  const Icon = open ? ChevronUp : ChevronDown;
  return <View style={{ marginTop: 24 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
      <View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>{title}</Text><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>{summary}</Text></View>
      <Icon color={theme.faint} size={19} />
    </Pressable>
    {open ? <View style={{ marginTop: 11 }}>{children}</View> : null}
  </View>;
}

export default function MonitorScreen() {
  const range = useMemo(() => last24Hours(), []);
  const stats = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats, staleTime: 30_000 });
  const settings = useQuery({ queryKey: ['admin-settings'], queryFn: getAdminSettings, staleTime: 120_000 });
  const version = useQuery({ queryKey: ['system-version'], queryFn: getSystemVersion, staleTime: 300_000 });
  const accounts = useQuery({ queryKey: ['dashboard-accounts'], queryFn: () => listAccounts('', { page_size: 50 }), staleTime: 30_000 });
  const trend = useQuery({ queryKey: ['dashboard-trend-24h'], queryFn: () => getDashboardTrend(range), staleTime: 30_000 });
  const failures = useQuery({ queryKey: ['dashboard-failures'], queryFn: () => listRequestErrors({ page_size: 5, resolved: false }), staleTime: 30_000 });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [poolOpen, setPoolOpen] = useState(false);
  const [trendOpen, setTrendOpen] = useState(false);
  const [failuresOpen, setFailuresOpen] = useState(false);

  const queries = [stats, settings, version, accounts, trend, failures];
  const loading = stats.isLoading || accounts.isLoading;
  const error = stats.error || accounts.error;
  const refreshing = queries.some((query) => query.isRefetching);
  const refresh = () => { queries.forEach((query) => void query.refetch()); };
  const accountItems = accounts.data?.items ?? [];
  const disabled = accountItems.filter((item) => item.schedulable === false).length;
  const abnormal = accountItems.filter((item) => item.status === 'error' || Boolean(item.error_message)).length;
  const maxRequests = Math.max(...(trend.data?.trend ?? []).map((point) => point.requests), 1);
  const actualBilling = stats.data?.today_actual_cost;
  const officialReference = stats.data?.today_standard_cost;

  return (
    <Page
      title={'运营概览'}
      subtitle={`${settings.data?.site_name || 'Vexlune Hub'} · ${version.data?.version || '版本未知'}`}
      refreshing={refreshing}
      onRefresh={refresh}
      right={<Pressable accessibilityLabel="refresh-dashboard" onPress={refresh} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: theme.cardRaised, alignItems: 'center', justifyContent: 'center' }}><RefreshCw color={theme.primary} size={19} /></Pressable>}
    >
      <StateCard loading={loading} error={error} onRetry={refresh} />
      {!loading && !error ? <>
        <Card style={{ paddingVertical: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}><CircleCheck color={theme.success} size={21} /><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>{'Hub 连接正常'}</Text><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>{'最近刷新于 '}{new Date().toLocaleTimeString('zh-CN')}</Text></View><Badge label="ONLINE" tone="success" /></View>
          {abnormal > 0 ? <Pressable onPress={() => router.push('/exceptions')} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: theme.border }}><AlertTriangle color={theme.danger} size={15} /><Text style={{ flex: 1, color: theme.danger, fontSize: 12, fontWeight: '700' }}>{`${abnormal} 个上游账号有异常`}</Text><Text style={{ color: theme.danger, fontSize: 12, fontWeight: '800' }}>{'查看异常'}</Text><ChevronRight color={theme.danger} size={15} /></Pressable> : null}
        </Card>

        <SectionTitle title={'今日核心指标'} />
        <View style={{ flexDirection: 'row', gap: 10 }}><Metric label={'请求数'} value={count(stats.data?.today_requests)} /><Metric label={'成功率'} value={successRate(stats.data)} tone="success" /></View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}><Metric label={'实际计费'} value={money(actualBilling)} tone="warning" /><Metric label={'失败请求'} value={count(stats.data?.today_failed_requests)} tone="danger" /></View>

        <Disclosure title={'运行明细'} summary={`Token ${formatTokenValue(stats.data?.today_tokens ?? 0)} · RPM ${count(stats.data?.rpm)}`} open={detailsOpen} onPress={() => setDetailsOpen((value) => !value)}>
          <Card><View style={{ flexDirection: 'row', gap: 10 }}><Metric label={'总 Token'} value={formatTokenValue(stats.data?.today_tokens ?? 0)} /><Metric label="RPM" value={count(stats.data?.rpm)} /></View><Text style={{ color: theme.subtext, fontSize: 11, lineHeight: 17, marginTop: 14 }}>{'实际计费仅使用 Hub 返回的 today_actual_cost；缺失时不用 today_cost 推测。官方标准价格'}<Text style={{ color: theme.primary, fontWeight: '900' }}>{money(officialReference)}</Text>{'，仅作参考。'}</Text></Card>
        </Disclosure>

        <Disclosure title={'用户与账号池'} summary={`用户 ${count(stats.data?.total_users)} · 上游账号 ${accounts.data?.total ?? stats.data?.total_accounts ?? 0}`} open={poolOpen} onPress={() => setPoolOpen((value) => !value)}>
          <View style={{ flexDirection: 'row', gap: 10 }}><Metric label={'用户总数'} value={count(stats.data?.total_users)} /><Metric label={'今日新增'} value={count(stats.data?.today_new_users)} tone="success" /><Metric label={'活跃用户'} value={count(stats.data?.active_users)} /></View>
          <Pressable onPress={() => router.push('/accounts')} style={{ marginTop: 12 }}><Card><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>{'上游账号'}</Text><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>{`共 ${accounts.data?.total ?? stats.data?.total_accounts ?? 0} · 异常 ${abnormal} · 已停用 ${disabled}`}</Text></View>{abnormal > 0 ? <AlertTriangle color={theme.danger} size={20} /> : <CircleCheck color={theme.success} size={20} />}<ChevronRight color={theme.faint} size={18} /></View></Card></Pressable>
        </Disclosure>

        <Disclosure title={'24 小时请求趋势'} summary={'按小时查看请求量变化'} open={trendOpen} onPress={() => setTrendOpen((value) => !value)}>
          <Card>{(trend.data?.trend ?? []).length ? <View style={{ height: 126, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>{(trend.data?.trend ?? []).slice(-24).map((point, index) => <View key={`${point.date}-${index}`} accessibilityLabel={`trend-${index}`} style={{ flex: 1, minHeight: 3, height: `${Math.max(4, (point.requests / maxRequests) * 100)}%`, borderRadius: 3, backgroundColor: index === (trend.data?.trend.length ?? 0) - 1 ? theme.primary : '#493A6B' }} />)}</View> : <Text style={{ color: theme.subtext, textAlign: 'center', paddingVertical: 26 }}>{'当前时间范围没有趋势数据'}</Text>}</Card>
        </Disclosure>

        <Disclosure title={'最近失败'} summary={`${failures.data?.items.length ?? 0} 条未处理记录`} open={failuresOpen} onPress={() => setFailuresOpen((value) => !value)}>
          <View style={{ gap: 9 }}>{(failures.data?.items ?? []).length ? failures.data!.items.map((item) => <Card key={item.id}><View style={{ flexDirection: 'row', gap: 10 }}><AlertTriangle color={theme.danger} size={18} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: theme.text, fontWeight: '700' }}>{item.model || item.request_path || `Request #${item.id}`}</Text><Text numberOfLines={2} style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 5 }}>{item.message || `HTTP ${item.status_code ?? '--'}`}</Text></View><Badge label={String(item.status_code ?? 'ERR')} tone="danger" /></View></Card>) : <Card><Text style={{ color: theme.subtext, textAlign: 'center' }}>{'暂无失败记录'}</Text></Card>}</View>
          <Pressable onPress={() => router.push('/exceptions')} style={{ alignItems: 'center', marginTop: 12, paddingVertical: 8 }}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>{'查看全部异常'}</Text></Pressable>
        </Disclosure>
      </> : null}
    </Page>
  );
}
