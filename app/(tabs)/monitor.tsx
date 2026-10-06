import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Activity, Bell, ChevronRight, CircleCheck, CircleDollarSign, Layers3, Megaphone, RefreshCw, Server, ShieldAlert, UsersRound } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Badge, Card, Page, RefreshError, StateCard } from '@/src/components/ui';
import { ApiError } from '@/src/lib/admin-fetch';
import { getAdminSettings, getDashboardStats, getDashboardTrend, getSystemVersion, listAccounts, listRequestErrors } from '@/src/services/admin';
import { getOpsDashboardOverview, listAlertEvents, type OpsDashboardOverview } from '@/src/services/admin-extended';
import { theme } from '@/src/theme';

type TrendMetric = 'requests' | 'total_tokens' | 'actual_cost';

type SparklineProps = {
  values: number[];
  color?: string;
};

function count(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('zh-CN').format(value) : '--';
}


function lastSevenDays() {
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
  const key = (value: Date) => `${value.getFullYear()}-${`${value.getMonth() + 1}`.padStart(2, '0')}-${`${value.getDate()}`.padStart(2, '0')}`;
  return { start_date: key(start), end_date: key(end), granularity: 'day' as const };
}

function formatTrendDate(value: string, today: string) {
  if (value === today) return '今天';
  const match = /^(?:\d{4}-)?(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[1]}/${match[2]}` : value.slice(0, 10);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function opsNumber(value?: number | null) {
  return isFiniteNumber(value) ? new Intl.NumberFormat('zh-CN').format(value) : '--';
}

function opsRatioPercent(value?: number | null, digits = 2) {
  if (!isFiniteNumber(value)) return '--';
  return `${(value <= 1 ? value * 100 : value).toFixed(digits)}%`;
}

function opsStatus(data?: OpsDashboardOverview, error?: unknown) {
  if (!data) {
    if (error instanceof ApiError && error.code === 'OPS_DISABLED') return { label: '未启用', tone: 'warning' as const };
    if (error) return { label: '同步失败', tone: 'warning' as const };
    return { label: '同步中', tone: 'default' as const };
  }
  const score = data.health_score;
  if (!isFiniteNumber(score)) return { label: '已连接', tone: 'success' as const };
  if (score >= 90) return { label: 'ONLINE', tone: 'success' as const };
  return { label: score >= 70 ? 'DEGRADED' : '风险', tone: 'warning' as const };
}

function OpsMiniCard({ label, value, detail, tone = 'default' }: { label: string; value: string; detail: string; tone?: 'default' | 'success' | 'warning' }) {
  const color = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.text;
  return <View style={{ flex: 1, minWidth: 0, borderRadius: 15, backgroundColor: theme.cardRaised, borderWidth: 1, borderColor: theme.border, padding: 11 }}>
    <Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 10 }}>{label}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={{ color, fontSize: 17, fontWeight: '900', marginTop: 7 }}>{value}</Text>
    <Text numberOfLines={2} style={{ color: theme.faint, fontSize: 9, lineHeight: 13, marginTop: 4 }}>{detail}</Text>
  </View>;
}

function resourceTone(value?: boolean | null) {
  if (value === true) return 'success' as const;
  if (value === false) return 'warning' as const;
  return 'default' as const;
}

function TrendChart({ points, unit, today }: { points: { date: string; value?: number }[]; unit: string; today: string }) {
  const visible = points.slice(-7);
  const values = visible.map((point) => point.value).filter(isFiniteNumber);
  const max = Math.max(...values, 0);
  if (!visible.length || !values.length) return <Text style={{ color: theme.subtext, textAlign: 'center', paddingVertical: 28 }}>当前时间范围没有可用的趋势数据</Text>;
  const scale = max || 1;
  const latest = visible[visible.length - 1];
  return <View accessibilityLabel="monitor-trend" style={{ marginTop: 14 }}>
    <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
      <View style={{ width: 43, height: 156, justifyContent: 'space-between', paddingBottom: 25 }}>
        {[max, max / 2, 0].map((tick, index) => <Text key={`${tick}-${index}`} style={{ color: theme.faint, fontSize: 9, textAlign: 'right' }}>{count(tick)}{index === 0 ? ` ${unit}` : ''}</Text>)}
      </View>
      <View style={{ flex: 1, marginLeft: 8 }}>
        <View style={{ height: 124, flexDirection: 'row', alignItems: 'stretch', gap: 5 }}>
          {visible.map((point) => {
            const hasValue = isFiniteNumber(point.value);
            const height = hasValue ? Math.max(5, (point.value! / scale) * 100) : 4;
            const isToday = point.date === today;
            return <View key={point.date} accessibilityLabel={`${point.date} ${hasValue ? `${count(point.value)} ${unit}` : '未获取'}`} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}><View style={{ height: `${height}%`, minHeight: 4, borderRadius: 5, backgroundColor: !hasValue ? theme.muted : isToday ? theme.primary : theme.primarySoft }} /></View>;
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 5, marginTop: 7 }}>
          {visible.map((point) => <Text key={`${point.date}-label`} numberOfLines={1} style={{ flex: 1, color: point.date === today ? theme.primary : theme.faint, fontSize: 9, fontWeight: point.date === today ? '800' : '500', textAlign: 'center' }}>{formatTrendDate(point.date, today)}</Text>)}
        </View>
      </View>
    </View>
    <Text style={{ color: theme.text, fontSize: 12, fontWeight: '800', marginTop: 10 }}>{latest && isFiniteNumber(latest.value) ? `${formatTrendDate(latest.date, today)} · ${count(latest.value)} ${unit}` : '最近一天数据未获取'}</Text>
    <Text style={{ color: theme.subtext, fontSize: 10, marginTop: 4 }}>每柱为当日合计 · 单位：{unit} · 灰色表示未获取</Text>
  </View>;
}

function Sparkline({ values, color = theme.primary }: SparklineProps) {
  const finite = values.filter((value) => Number.isFinite(value) && value >= 0);
  const max = Math.max(...finite, 1);
  if (!finite.length) return <View style={{ height: 27 }} />;
  return <View accessibilityLabel="metric-sparkline" style={{ height: 27, flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 8 }}>
    {finite.slice(-8).map((value, index) => <View key={`${value}-${index}`} style={{ flex: 1, minHeight: 3, height: `${Math.max(10, (value / max) * 100)}%`, borderRadius: 4, backgroundColor: color, opacity: index === finite.slice(-8).length - 1 ? 1 : 0.35 }} />)}
  </View>;
}

function KpiCard({ icon: Icon, label, value, tone = 'primary', values }: { icon: typeof Activity; label: string; value: string; tone?: 'primary' | 'success' | 'warning' | 'danger'; values?: number[] }) {
  const palette = tone === 'success' ? { icon: theme.success, soft: theme.successSoft } : tone === 'warning' ? { icon: theme.warning, soft: theme.warningSoft } : tone === 'danger' ? { icon: theme.danger, soft: theme.dangerSoft } : { icon: theme.primary, soft: theme.primarySoft };
  return <Card style={{ flex: 1, minWidth: 0, padding: 12 }}>
    <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: palette.soft, alignItems: 'center', justifyContent: 'center' }}><Icon color={palette.icon} size={17} /></View>
    <Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 11, marginTop: 9 }}>{label}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.text, fontSize: 18, fontWeight: '900', marginTop: 4 }}>{value}</Text>
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
  const alerts = useQuery({ queryKey: ['dashboard-alert-events'], queryFn: () => listAlertEvents({ limit: 50 }), staleTime: 30_000 });
  const ops = useQuery({ queryKey: ['ops-dashboard-overview'], queryFn: () => getOpsDashboardOverview({ time_range: '1h' }), staleTime: 30_000 });
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('requests');

  const queries = [stats, settings, version, accounts, trend, failures, alerts, ops];
  const loading = stats.isLoading || accounts.isLoading;
  const error = stats.error || accounts.error;
  const hasPrimaryData = Boolean(stats.data || accounts.data);
  const refreshError = error || settings.error || version.error || trend.error || failures.error || alerts.error || ops.error;
  const refreshing = queries.some((query) => query.isRefetching);
  const refresh = () => { queries.forEach((query) => void query.refetch()); };
  const accountItems = accounts.data?.items ?? [];
  const totalAccounts = stats.data?.total_accounts ?? accounts.data?.total;
  const availableAccounts = stats.data?.normal_accounts ?? (accountItems.length ? accountItems.filter((item) => item.status !== 'error' && item.schedulable !== false).length : undefined);
  // The stats endpoint reports the whole instance, while the list endpoint is
  // scoped to the rows returned to this screen. Prefer the larger observed
  // value so an account carrying a concrete error_message cannot be hidden by
  // a stale aggregate value of zero. The card remains explicit about the
  // scope when only the current page supplied the evidence.
  const trendItems = trend.data?.trend ?? [];
  const trendPoints = trendItems.map((point) => ({ date: point.date, value: trendMetric === 'requests' ? point.requests : trendMetric === 'total_tokens' ? point.total_tokens : point.actual_cost }));
  const accountTrend = accountItems.map((item) => item.current_concurrency).filter(isFiniteNumber);
  const alertItems = alerts.data ?? [];
  const alertsAvailable = Array.isArray(alerts.data);
  const unresolvedAlerts = alertsAvailable ? alertItems.filter((item) => item.status !== 'resolved' && item.status !== 'manual_resolved') : [];
  const rateLimitAlerts = alertsAvailable ? alertItems.filter((item) => /rate|limit|限流/i.test(`${item.title ?? ''} ${item.description ?? ''} ${item.severity ?? ''}`)) : [];
  const recoveredAlerts = alertsAvailable ? alertItems.filter((item) => item.status === 'resolved' || item.status === 'manual_resolved') : [];

  return <Page title="运营概览" subtitle={`${settings.data?.site_name || 'Vexlune Hub'} · ${version.data?.version || '版本未知'}`} refreshing={refreshing} onRefresh={refresh} right={<Pressable accessibilityLabel="refresh-dashboard" onPress={refresh} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: theme.cardRaised, alignItems: 'center', justifyContent: 'center' }}><RefreshCw color={theme.primary} size={19} /></Pressable>}>
    <StateCard loading={loading} error={!hasPrimaryData ? refreshError : undefined} onRetry={refresh} />
    {!loading && (hasPrimaryData || !refreshError) ? <>
      <RefreshError error={hasPrimaryData ? refreshError : undefined} onRetry={refresh} />
      <SectionHeader title="今日核心指标" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <KpiCard icon={Server} label="在线节点" value={`${count(availableAccounts)} / ${count(totalAccounts)}`} tone="success" values={accountTrend} />
        <KpiCard icon={Activity} label="请求 / 分钟" value={count(stats.data?.rpm)} values={trendItems.map((point) => point.requests).filter(isFiniteNumber)} />
        <KpiCard icon={Layers3} label="Token / 分钟" value={count(stats.data?.tpm)} tone="warning" />
      </View>

      <SectionHeader title="近 7 天趋势" />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {([['requests', '请求量'], ['total_tokens', 'Token'], ['actual_cost', '实际计费']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setTrendMetric(value)} style={{ borderRadius: 999, backgroundColor: trendMetric === value ? theme.primary : theme.cardRaised, paddingHorizontal: 11, paddingVertical: 7 }}><Text style={{ color: trendMetric === value ? '#FFFFFF' : theme.subtext, fontSize: 11, fontWeight: '800' }}>{label}</Text></Pressable>)}
          </View>
          <Text style={{ color: theme.subtext, fontSize: 11 }}>{range.start_date.slice(5)}–{range.end_date.slice(5)}（含今日）</Text>
        </View>
        <TrendChart points={trendPoints} unit={trendMetric === 'requests' ? '次' : trendMetric === 'total_tokens' ? 'Token' : '金额'} today={range.end_date} />
      </Card>

      <SectionHeader title="服务状态" action="查看异常" onAction={() => router.push('/exceptions')} />
      <Card>
        {(() => {
          const state = opsStatus(ops.data, ops.error);
          const metrics = ops.data?.system_metrics;
          const slaAvailable = (ops.data?.request_count_sla ?? 0) > 0;
          return <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: state.tone === 'success' ? theme.successSoft : theme.warningSoft, alignItems: 'center', justifyContent: 'center' }}><CircleCheck color={state.tone === 'success' ? theme.success : theme.warning} size={19} /></View>
              <View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '900' }}>Sub2API 运维状态</Text><Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }}>{ops.data ? '官方 Ops 概览 · 近 1 小时' : state.label === '未启用' ? '服务端未启用 Ops 监控' : state.label === '同步失败' ? '官方 Ops 接口同步失败' : '等待官方 Ops 接口响应'}</Text></View><Badge label={state.label} tone={state.tone === 'default' ? 'muted' : state.tone} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 13 }}><OpsMiniCard label="健康评分" value={opsNumber(ops.data?.health_score)} detail="官方评分 / 100" tone={ops.data?.health_score !== undefined ? (ops.data.health_score >= 90 ? 'success' : 'warning') : 'default'} /><OpsMiniCard label="QPS / TPS" value={isFiniteNumber(ops.data?.qps?.current) ? ops.data!.qps!.current!.toFixed(1) : '--'} detail={isFiniteNumber(ops.data?.tps?.current) ? `TPS ${ops.data!.tps!.current!.toFixed(1)} · 峰值 ${ops.data!.tps!.peak?.toFixed(1) ?? '--'}` : '吞吐未返回'} tone={ops.data ? 'success' : 'default'} /></View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><OpsMiniCard label="SLA" value={slaAvailable ? opsRatioPercent(ops.data?.sla, 3) : '--'} detail={`窗口请求 ${opsNumber(ops.data?.request_count_sla)}`} tone={slaAvailable && (ops.data?.sla ?? 0) >= 0.99 ? 'success' : ops.data ? 'warning' : 'default'} /><OpsMiniCard label="错误率" value={opsRatioPercent(ops.data?.error_rate, 3)} detail={ops.data ? `上游 ${opsRatioPercent(ops.data.upstream_error_rate, 3)}` : '错误指标未返回'} tone={ops.data ? ((ops.data.error_rate ?? 0) <= 0.01 ? 'success' : 'warning') : 'default'} /></View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><OpsMiniCard label="请求延迟 P99" value={opsNumber(ops.data?.duration?.p99_ms)} detail="毫秒 · 近 1 小时" tone={ops.data ? 'success' : 'default'} /><OpsMiniCard label="首字延迟 P99" value={opsNumber(ops.data?.ttft?.p99_ms)} detail="毫秒 · 近 1 小时" tone={ops.data ? 'success' : 'default'} /></View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><OpsMiniCard label="CPU" value={isFiniteNumber(metrics?.cpu_usage_percent) ? `${metrics.cpu_usage_percent.toFixed(1)}%` : '--'} detail="系统快照" tone={metrics ? 'success' : 'default'} /><OpsMiniCard label="内存" value={isFiniteNumber(metrics?.memory_usage_percent) ? `${metrics.memory_usage_percent.toFixed(1)}%` : '--'} detail={isFiniteNumber(metrics?.memory_used_mb) && isFiniteNumber(metrics?.memory_total_mb) ? `${opsNumber(metrics.memory_used_mb)} / ${opsNumber(metrics.memory_total_mb)} MB` : '容量未返回'} tone={metrics ? 'success' : 'default'} /></View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}><OpsMiniCard label="数据库" value={metrics?.db_ok === true ? '正常' : metrics?.db_ok === false ? '异常' : '--'} detail={isFiniteNumber(metrics?.db_conn_active) ? `活动连接 ${opsNumber(metrics.db_conn_active)}` : '连接指标未返回'} tone={resourceTone(metrics?.db_ok)} /><OpsMiniCard label="Redis" value={metrics?.redis_ok === true ? '正常' : metrics?.redis_ok === false ? '异常' : '--'} detail={isFiniteNumber(metrics?.redis_conn_total) ? `连接 ${opsNumber(metrics.redis_conn_total)}` : '连接指标未返回'} tone={resourceTone(metrics?.redis_ok)} /></View>
            <Text style={{ color: theme.faint, fontSize: 10, lineHeight: 15, marginTop: 11 }}>仅展示官方 Ops 接口实际返回的运行指标；未启用监控或字段缺失时不推断状态。</Text>
          </>;
        })()}
      </Card>

      <SectionHeader title="异常聚合" action={unresolvedAlerts.length ? '处理告警' : undefined} onAction={() => router.push('/admin-security')} />
      <Pressable onPress={() => router.push('/admin-security')}>
        <Card style={{ paddingVertical: 13 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: !alertsAvailable ? theme.subtext : unresolvedAlerts.length ? theme.danger : theme.success, fontSize: 20, fontWeight: '900' }}>{alertsAvailable ? count(unresolvedAlerts.length) : '--'}</Text><Text style={{ color: theme.subtext, fontSize: 10, marginTop: 4 }}>待处理异常</Text></View>
            <View style={{ width: 1, backgroundColor: theme.border }} />
            <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: !alertsAvailable ? theme.subtext : rateLimitAlerts.length ? theme.warning : theme.subtext, fontSize: 20, fontWeight: '900' }}>{alertsAvailable ? count(rateLimitAlerts.length) : '--'}</Text><Text style={{ color: theme.subtext, fontSize: 10, marginTop: 4 }}>限流相关</Text></View>
            <View style={{ width: 1, backgroundColor: theme.border }} />
            <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: !alertsAvailable ? theme.subtext : theme.success, fontSize: 20, fontWeight: '900' }}>{alertsAvailable ? count(recoveredAlerts.length) : '--'}</Text><Text style={{ color: theme.subtext, fontSize: 10, marginTop: 4 }}>已恢复</Text></View>
          </View>
          <Text style={{ color: alerts.error ? theme.warning : theme.faint, fontSize: 10, textAlign: 'center', marginTop: 10 }}>{alerts.error ? '告警接口暂不可用，未显示推断数据' : '数据来自服务端告警事件'}</Text>
        </Card>
      </Pressable>

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
