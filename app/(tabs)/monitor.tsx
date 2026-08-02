import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle as SvgCircle, Path } from 'react-native-svg';

import { Badge, Card, Page, SectionTitle, StateCard } from '@/src/components/ui';
import { formatTokenValue } from '@/src/lib/formatters';
import {
  getAdminSettings,
  getDashboardModels,
  getDashboardStats,
  getDashboardTrend,
  getSystemVersion,
  getUsageStats,
  listAccounts,
  listUsageLogs,
} from '@/src/services/admin';
import { theme } from '@/src/theme';
import type { ModelStat, TrendPoint, UsageLog } from '@/src/types/admin';

type OverviewMode = 'overview' | 'today';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const MODEL_COLORS = ['#3187F6', '#43D6A0', '#8B5CF6', '#F59E0B', '#EC4899'];
const TREND_SERIES = [
  { key: 'input_tokens', label: '输入', color: '#3187F6' },
  { key: 'output_tokens', label: '输出', color: '#10A56B' },
  { key: 'cache_creation_tokens', label: '缓存创建', color: '#F97316' },
  { key: 'cache_read_tokens', label: '缓存读取', color: '#8B5CF6' },
] as const;

function count(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('zh-CN').format(value) : '--';
}

function duration(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}

function dateRange(hours: number) {
  const end = new Date();
  const start = new Date(end.getTime() - (hours - 1) * 60 * 60 * 1000);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
    granularity: 'hour' as const,
  };
}

function SummaryMetric({ icon, iconColor, iconBackground, label, value, detail, detailColor }: {
  icon: IconName;
  iconColor: string;
  iconBackground: string;
  label: string;
  value: string;
  detail?: string;
  detailColor?: string;
}) {
  return (
    <Card style={{ flexBasis: '47%', flexGrow: 1, minHeight: 140, padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: iconBackground, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} color={iconColor} size={21} />
        </View>
        <Text style={{ color: theme.subtext, fontSize: 13, fontWeight: '600', flex: 1 }}>{label}</Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.text, fontSize: 25, fontWeight: '900', marginTop: 12 }}>{value}</Text>
      {detail ? <Text numberOfLines={2} style={{ color: detailColor || theme.faint, fontSize: 11, lineHeight: 17, marginTop: 8 }}>{detail}</Text> : null}
    </Card>
  );
}

function SegmentedControl({ value, onChange }: { value: OverviewMode; onChange: (value: OverviewMode) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: theme.cardRaised, borderRadius: 15, padding: 3, marginTop: 12 }}>
      {([['overview', '运营总览'], ['today', '今日数据']] as const).map(([key, label]) => (
        <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: value === key }} onPress={() => onChange(key)} style={{ flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: value === key ? theme.card : 'transparent' }}>
          <Text style={{ color: value === key ? theme.primary : theme.subtext, fontWeight: value === key ? '900' : '700' }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ModelDistribution({ models }: { models: ModelStat[] }) {
  const visible = models.slice().sort((a, b) => b.requests - a.requests).slice(0, 4);
  const total = visible.reduce((sum, item) => sum + item.requests, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ color: theme.text, fontSize: 17, fontWeight: '900', flex: 1 }}>模型分布</Text>
        <Pressable onPress={() => router.push('/logs')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingLeft: 10 }}>
          <Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '700' }}>查看全部</Text>
          <Ionicons name="chevron-forward" color={theme.faint} size={14} />
        </Pressable>
      </View>
      {!visible.length ? <Text style={{ color: theme.subtext, textAlign: 'center', paddingVertical: 28 }}>当前时间范围没有模型调用数据</Text> : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 112, height: 112, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={108} height={108} viewBox="0 0 108 108">
              <SvgCircle cx="54" cy="54" r={radius} fill="none" stroke={theme.cardRaised} strokeWidth="18" />
              {visible.map((item, index) => {
                const portion = total ? item.requests / total : 0;
                const length = circumference * portion;
                const currentOffset = offset;
                offset += length;
                return <SvgCircle key={item.model} cx="54" cy="54" r={radius} fill="none" stroke={MODEL_COLORS[index]} strokeWidth="18" strokeDasharray={`${length} ${Math.max(0, circumference - length)}`} strokeDashoffset={-currentOffset} strokeLinecap="butt" rotation="-90" origin="54,54" />;
              })}
            </Svg>
            <View pointerEvents="none" style={{ position: 'absolute', alignItems: 'center' }}>
              <Text style={{ color: theme.text, fontWeight: '900', fontSize: 16 }}>{count(total)}</Text>
              <Text style={{ color: theme.faint, fontSize: 9, marginTop: 2 }}>请求</Text>
            </View>
          </View>
          <View style={{ flex: 1, gap: 12 }}>
            {visible.map((item, index) => {
              const ratio = total ? (item.requests / total) * 100 : 0;
              return (
                <View key={item.model}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: MODEL_COLORS[index] }} />
                    <Text numberOfLines={1} style={{ color: theme.text, fontSize: 12, fontWeight: '800', flex: 1 }}>{item.model}</Text>
                    <Text style={{ color: theme.subtext, fontSize: 11 }}>{ratio.toFixed(1)}%</Text>
                  </View>
                  <Text style={{ color: theme.faint, fontSize: 10, marginTop: 4, marginLeft: 17 }}>{count(item.requests)} 次 · {formatTokenValue(item.total_tokens)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </Card>
  );
}

function pathFor(points: TrendPoint[], key: typeof TREND_SERIES[number]['key'], width: number, height: number, max: number) {
  return points.map((point, index) => {
    const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * width;
    const y = height - (point[key] / max) * (height - 10) - 5;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

function TokenTrend({ points }: { points: TrendPoint[] }) {
  const data = points.slice(-24);
  const max = Math.max(...data.flatMap((point) => TREND_SERIES.map((series) => point[series.key])), 1);
  return (
    <Card>
      <Text style={{ color: theme.text, fontSize: 17, fontWeight: '900' }}>Token 使用趋势</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
        {TREND_SERIES.map((series) => <View key={series.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: series.color }} /><Text style={{ color: theme.subtext, fontSize: 10 }}>{series.label}</Text></View>)}
      </View>
      {!data.length ? <Text style={{ color: theme.subtext, textAlign: 'center', paddingVertical: 34 }}>当前时间范围没有 Token 趋势数据</Text> : <>
        <View style={{ height: 154, marginTop: 16, borderRadius: 14, backgroundColor: theme.cardRaised, padding: 12 }}>
          <Svg width="100%" height="100%" viewBox="0 0 320 130">
            {TREND_SERIES.map((series) => <Path key={series.key} d={pathFor(data, series.key, 320, 130, max)} fill="none" stroke={series.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />)}
          </Svg>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
          <Text style={{ color: theme.faint, fontSize: 9 }}>{data[0]?.date ? new Date(data[0].date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit' }) : '--'}</Text>
          <Text style={{ color: theme.faint, fontSize: 9 }}>{data.at(-1)?.date ? new Date(data.at(-1)!.date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit' }) : '--'}</Text>
        </View>
      </>}
    </Card>
  );
}

function RecentLog({ item }: { item: UsageLog }) {
  const failed = item.status === 'error' || Boolean(item.error_message) || (item.status_code ?? 200) >= 400;
  return (
    <Pressable onPress={() => router.push('/logs')} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12 }}>
      <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: failed ? theme.dangerSoft : theme.successSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={failed ? 'warning-outline' : 'pulse-outline'} color={failed ? theme.danger : theme.success} size={21} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ color: theme.text, fontSize: 13, fontWeight: '900' }}>{item.model || item.request_type || `Request #${item.id}`}</Text>
        <Text numberOfLines={1} style={{ color: theme.faint, fontSize: 10, marginTop: 5 }}>{item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : '--'} · {duration(item.duration_ms)}</Text>
      </View>
      <Text style={{ color: theme.subtext, fontSize: 10 }}>Token {formatTokenValue(item.total_tokens ?? 0)}</Text>
      <Badge label={failed ? '失败' : '成功'} tone={failed ? 'danger' : 'success'} />
    </Pressable>
  );
}

export default function MonitorScreen() {
  const [mode, setMode] = useState<OverviewMode>('overview');
  const range = useMemo(() => dateRange(24), []);
  const stats = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats, staleTime: 30_000 });
  const settings = useQuery({ queryKey: ['admin-settings'], queryFn: getAdminSettings, staleTime: 120_000 });
  const version = useQuery({ queryKey: ['system-version'], queryFn: getSystemVersion, staleTime: 300_000 });
  const accounts = useQuery({ queryKey: ['dashboard-accounts'], queryFn: () => listAccounts('', { page_size: 50 }), staleTime: 30_000 });
  const trend = useQuery({ queryKey: ['dashboard-trend-24h'], queryFn: () => getDashboardTrend(range), staleTime: 30_000 });
  const models = useQuery({ queryKey: ['dashboard-models-24h'], queryFn: () => getDashboardModels(range), staleTime: 30_000 });
  const usage = useQuery({ queryKey: ['dashboard-usage-stats-24h'], queryFn: () => getUsageStats(range), staleTime: 30_000 });
  const recent = useQuery({ queryKey: ['dashboard-recent'], queryFn: () => listUsageLogs({ page_size: 3 }), staleTime: 30_000 });

  const queries = [stats, settings, version, accounts, trend, models, usage, recent];
  const loading = stats.isLoading || accounts.isLoading;
  const error = stats.error || accounts.error;
  const refreshing = queries.some((query) => query.isRefetching);
  const refresh = () => { queries.forEach((query) => void query.refetch()); };
  const online = !error && stats.isSuccess && accounts.isSuccess;
  const accountItems = accounts.data?.items ?? [];
  const schedulable = accountItems.filter((item) => item.schedulable !== false && item.status !== 'error' && !item.error_message).length;
  const updatedAt = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const metricRows = mode === 'overview' ? [
    { icon: 'key-outline' as IconName, iconColor: '#2478E8', iconBackground: '#E7F1FF', label: 'API 密钥', value: count(stats.data?.total_api_keys), detail: `${count(stats.data?.active_api_keys)} 启用`, detailColor: theme.success },
    { icon: 'people-outline' as IconName, iconColor: theme.primary, iconBackground: theme.primarySoft, label: '账号', value: count(accounts.data?.total ?? stats.data?.total_accounts), detail: `${count(schedulable)} 可调度`, detailColor: theme.success },
    { icon: 'person-outline' as IconName, iconColor: theme.success, iconBackground: theme.successSoft, label: '用户', value: count(stats.data?.total_users), detail: `${count(stats.data?.active_users)} 活跃` },
    { icon: 'stats-chart-outline' as IconName, iconColor: theme.success, iconBackground: theme.successSoft, label: '今日请求', value: count(stats.data?.today_requests), detail: `累计 ${count(stats.data?.total_requests)}` },
    { icon: 'cube-outline' as IconName, iconColor: theme.warning, iconBackground: theme.warningSoft, label: '今日 Token', value: formatTokenValue(stats.data?.today_tokens ?? 0), detail: `输入 ${formatTokenValue(stats.data?.today_input_tokens ?? 0)} · 输出 ${formatTokenValue(stats.data?.today_output_tokens ?? 0)}` },
    { icon: 'server-outline' as IconName, iconColor: theme.primary, iconBackground: theme.primarySoft, label: '总 Token', value: formatTokenValue(stats.data?.total_tokens ?? 0), detail: '后端累计用量' },
    { icon: 'flash-outline' as IconName, iconColor: theme.primary, iconBackground: theme.primarySoft, label: '性能指标', value: `${count(stats.data?.rpm)} RPM`, detail: `${formatTokenValue(stats.data?.tpm ?? 0)} TPM`, detailColor: theme.primary },
    { icon: 'time-outline' as IconName, iconColor: theme.danger, iconBackground: theme.dangerSoft, label: '平均响应', value: duration(usage.data?.average_duration_ms), detail: `${count(stats.data?.active_users)} 活跃用户` },
  ] : [
    { icon: 'stats-chart-outline' as IconName, iconColor: theme.success, iconBackground: theme.successSoft, label: '今日请求', value: count(stats.data?.today_requests), detail: `${count(stats.data?.today_failed_requests)} 次失败`, detailColor: (stats.data?.today_failed_requests ?? 0) > 0 ? theme.danger : theme.success },
    { icon: 'cube-outline' as IconName, iconColor: theme.warning, iconBackground: theme.warningSoft, label: '今日 Token', value: formatTokenValue(stats.data?.today_tokens ?? 0), detail: `缓存读取 ${formatTokenValue(stats.data?.today_cache_read_tokens ?? 0)}` },
    { icon: 'enter-outline' as IconName, iconColor: '#2478E8', iconBackground: '#E7F1FF', label: '输入 Token', value: formatTokenValue(stats.data?.today_input_tokens ?? 0), detail: 'Hub 实时统计' },
    { icon: 'exit-outline' as IconName, iconColor: theme.success, iconBackground: theme.successSoft, label: '输出 Token', value: formatTokenValue(stats.data?.today_output_tokens ?? 0), detail: 'Hub 实时统计' },
    { icon: 'flash-outline' as IconName, iconColor: theme.primary, iconBackground: theme.primarySoft, label: 'RPM / TPM', value: `${count(stats.data?.rpm)} / ${formatTokenValue(stats.data?.tpm ?? 0)}`, detail: '当前速率' },
    { icon: 'time-outline' as IconName, iconColor: theme.danger, iconBackground: theme.dangerSoft, label: '平均响应', value: duration(usage.data?.average_duration_ms), detail: '最近 24 小时' },
  ];

  return (
    <Page
      title="概览"
      subtitle={`${settings.data?.site_name || 'Hub Vexlune'} · ${version.data?.version || '版本未知'}`}
      refreshing={refreshing}
      onRefresh={refresh}
      right={<Pressable accessibilityLabel="refresh-dashboard" onPress={refresh} style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="refresh" color={theme.primary} size={23} /></Pressable>}
    >
      <StateCard loading={loading} error={error} onRetry={refresh} />
      {!loading && !error ? <>
        <Card style={{ borderColor: online ? '#BDE8D5' : theme.dangerSoft, backgroundColor: online ? '#F8FFFB' : theme.dangerSoft }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
            <View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: online ? theme.success : theme.danger, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={online ? 'shield-checkmark' : 'warning'} color="#FFFFFF" size={27} /></View>
            <View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 17, fontWeight: '900' }}>{online ? 'Hub 运行正常' : 'Hub 连接异常'}</Text><Text style={{ color: theme.subtext, fontSize: 11, marginTop: 5 }}>API 服务{settings.isSuccess ? '在线' : '待确认'} · 更新于 {updatedAt}</Text></View>
            <Badge label={online ? 'ONLINE' : 'ERROR'} tone={online ? 'success' : 'danger'} />
          </View>
        </Card>

        <SegmentedControl value={mode} onChange={setMode} />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
          {metricRows.map((metric) => <SummaryMetric key={metric.label} {...metric} />)}
        </View>

        <SectionTitle title="模型分析" />
        <ModelDistribution models={models.data?.models ?? []} />

        <SectionTitle title="Token 趋势" />
        <TokenTrend points={trend.data?.trend ?? []} />

        <SectionTitle title="最近使用" action={<Pressable onPress={() => router.push('/logs')}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>查看全部</Text></Pressable>} />
        <Card>
          {(recent.data?.items ?? []).length ? recent.data!.items.map((item, index) => <View key={item.id}>{index > 0 ? <View style={{ height: 1, backgroundColor: theme.border }} /> : null}<RecentLog item={item} /></View>) : <Text style={{ color: theme.subtext, textAlign: 'center', paddingVertical: 26 }}>暂无最近调用记录</Text>}
        </Card>
      </> : null}
    </Page>
  );
}
