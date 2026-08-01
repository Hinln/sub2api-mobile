import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, ChevronRight, CircleCheck, RefreshCw } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Badge, Card, Metric, Page, SectionTitle, StateCard } from '@/src/components/ui';
import { formatTokenValue } from '@/src/lib/formatters';
import { getAdminSettings, getDashboardStats, getDashboardTrend, getSystemVersion, listAccounts, listUsageLogs } from '@/src/services/admin';
import { theme } from '@/src/theme';

function money(value?: number) { return typeof value === 'number' ? `$${value.toFixed(2)}` : '--'; }
function count(value?: number) { return typeof value === 'number' ? new Intl.NumberFormat('zh-CN').format(value) : '--'; }

function last24Hours() {
  const end = new Date();
  const start = new Date(end.getTime() - 23 * 60 * 60 * 1000);
  return { start_date: start.toISOString().slice(0, 10), end_date: end.toISOString().slice(0, 10), granularity: 'hour' as const };
}

export default function MonitorScreen() {
  const range = useMemo(() => last24Hours(), []);
  const stats = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats, staleTime: 30_000 });
  const settings = useQuery({ queryKey: ['admin-settings'], queryFn: getAdminSettings, staleTime: 120_000 });
  const version = useQuery({ queryKey: ['system-version'], queryFn: getSystemVersion, staleTime: 300_000 });
  const accounts = useQuery({ queryKey: ['dashboard-accounts'], queryFn: () => listAccounts('', { page_size: 50 }), staleTime: 30_000 });
  const trend = useQuery({ queryKey: ['dashboard-trend-24h'], queryFn: () => getDashboardTrend(range), staleTime: 30_000 });
  const failures = useQuery({ queryKey: ['dashboard-failures'], queryFn: () => listUsageLogs({ status: 'error', page_size: 5 }), staleTime: 30_000 });

  const queries = [stats, settings, version, accounts, trend, failures];
  const loading = stats.isLoading || accounts.isLoading;
  const error = stats.error || accounts.error;
  const refreshing = queries.some((query) => query.isRefetching);
  const refresh = () => { queries.forEach((query) => void query.refetch()); };
  const accountItems = accounts.data?.items ?? [];
  const disabled = accountItems.filter((item) => item.schedulable === false).length;
  const abnormal = accountItems.filter((item) => item.status === 'error' || Boolean(item.error_message)).length;
  const maxRequests = Math.max(...(trend.data?.trend ?? []).map((point) => point.requests), 1);

  return (
    <Page
      title={'\u6982\u89c8'}
      subtitle={`${settings.data?.site_name || 'Vexlune Hub'} \u00b7 ${version.data?.version || '\u7248\u672c\u672a\u77e5'}`}
      refreshing={refreshing}
      onRefresh={refresh}
      right={<Pressable accessibilityLabel="refresh-dashboard" onPress={refresh} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: theme.cardRaised, alignItems: 'center', justifyContent: 'center' }}><RefreshCw color={theme.primary} size={19} /></Pressable>}
    >
      <StateCard loading={loading} error={error} onRetry={refresh} />
      {!loading && !error ? <>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><CircleCheck color={theme.success} size={20} /><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>{'Hub \u8fde\u63a5\u6b63\u5e38'}</Text><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>{'\u6570\u636e\u66f4\u65b0\u4e8e '}{new Date().toLocaleTimeString('zh-CN')}</Text></View><Badge label="ONLINE" tone="success" /></View>
        </Card>

        <SectionTitle title={'\u4eca\u65e5\u6570\u636e'} />
        <View style={{ flexDirection: 'row', gap: 10 }}><Metric label={'\u8bf7\u6c42\u6570'} value={count(stats.data?.today_requests)} /><Metric label={'\u603b Token'} value={formatTokenValue(stats.data?.today_tokens ?? 0)} /><Metric label={'\u8ba1\u8d39\u91d1\u989d'} value={money(stats.data?.today_cost)} tone="warning" /></View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}><Metric label={'\u8f93\u5165 Token'} value={formatTokenValue(stats.data?.today_input_tokens ?? 0)} /><Metric label={'\u8f93\u51fa Token'} value={formatTokenValue(stats.data?.today_output_tokens ?? 0)} /><Metric label="RPM" value={count(stats.data?.rpm)} /></View>

        <SectionTitle title={'\u7528\u6237\u4e0e\u8d26\u53f7\u6c60'} />
        <View style={{ flexDirection: 'row', gap: 10 }}><Metric label={'\u7528\u6237\u603b\u6570'} value={count(stats.data?.total_users)} /><Metric label={'\u4eca\u65e5\u65b0\u589e'} value={count(stats.data?.today_new_users)} tone="success" /><Metric label={'\u6d3b\u8dc3\u7528\u6237'} value={count(stats.data?.active_users)} /></View>
        <Pressable onPress={() => router.push('/accounts')} style={{ marginTop: 10 }}><Card><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>{'\u4e0a\u6e38\u8d26\u53f7'}</Text><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>{`\u5171 ${accounts.data?.total ?? stats.data?.total_accounts ?? 0} \u00b7 \u5f02\u5e38 ${abnormal} \u00b7 \u5df2\u505c\u7528 ${disabled}`}</Text></View>{abnormal > 0 ? <AlertTriangle color={theme.danger} size={20} /> : <CircleCheck color={theme.success} size={20} />}<ChevronRight color={theme.faint} size={18} /></View></Card></Pressable>

        <SectionTitle title={'24 \u5c0f\u65f6\u8bf7\u6c42\u8d8b\u52bf'} />
        <Card>
          {(trend.data?.trend ?? []).length ? <View style={{ height: 126, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>{(trend.data?.trend ?? []).slice(-24).map((point, index) => <View key={`${point.date}-${index}`} accessibilityLabel={`trend-${index}`} style={{ flex: 1, minHeight: 3, height: `${Math.max(4, (point.requests / maxRequests) * 100)}%`, borderRadius: 3, backgroundColor: index === (trend.data?.trend.length ?? 0) - 1 ? theme.primary : '#493A6B' }} />)}</View> : <Text style={{ color: theme.subtext, textAlign: 'center', paddingVertical: 26 }}>{'\u5f53\u524d\u65f6\u95f4\u8303\u56f4\u6ca1\u6709\u8d8b\u52bf\u6570\u636e'}</Text>}
        </Card>

        <SectionTitle title={'\u6700\u8fd1\u5931\u8d25'} action={<Pressable onPress={() => router.push('/logs')}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>{'\u67e5\u770b\u5168\u90e8'}</Text></Pressable>} />
        {(failures.data?.items ?? []).length ? <View style={{ gap: 9 }}>{failures.data!.items.map((item) => <Card key={item.id}><View style={{ flexDirection: 'row', gap: 10 }}><AlertTriangle color={theme.danger} size={18} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: theme.text, fontWeight: '700' }}>{item.model || item.request_type || `Request #${item.id}`}</Text><Text numberOfLines={2} style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 5 }}>{item.error_message || `HTTP ${item.status_code ?? '--'}`}</Text></View><Badge label={String(item.status_code ?? 'ERR')} tone="danger" /></View></Card>)}</View> : <Card><Text style={{ color: theme.subtext, textAlign: 'center' }}>{'\u6682\u65e0\u5931\u8d25\u8bb0\u5f55'}</Text></Card>}
      </> : null}
    </Page>
  );
}
