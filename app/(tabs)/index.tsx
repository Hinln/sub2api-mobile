import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Activity, CircleAlert, CircleCheck, CircleDollarSign, ClipboardCheck, FileClock, KeyRound, Layers3, Megaphone, ReceiptText, RefreshCw, Server, UsersRound } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Badge, Card, Page, RefreshError, SectionTitle, StateCard } from '@/src/components/ui';
import { formatOptionalNumber, formatOptionalTokenValue } from '@/src/lib/formatters';
import { ApiError } from '@/src/lib/admin-fetch';
import { getAdminSettings, getDashboardStats, getSystemVersion } from '@/src/services/admin';
import { getAdminPaymentDashboard, getOpsDashboardOverview, type OpsDashboardOverview, type OpsJobHeartbeat, type OpsSystemMetricsSnapshot } from '@/src/services/admin-extended';
import { theme } from '@/src/theme';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function number(value?: number) {
  return isFiniteNumber(value) ? new Intl.NumberFormat('zh-CN').format(value) : '--';
}

function money(value?: number) {
  return isFiniteNumber(value) ? `$${value.toFixed(2)}` : '--';
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

function paymentMetricDetail(data?: { today_amount?: Record<string, number>; today_count?: number }, error?: unknown) {
  if (error) return '支付接口暂不可用';
  if (!data) return '支付统计未返回';
  const count = formatOptionalNumber(data.today_count);
  return `${count} 笔订单 · ${amounts(data.today_amount) === '--' ? '实收未提供' : '服务端统计'}`;
}

type RequestStats = { today_requests?: number; today_success_requests?: number; today_failed_requests?: number };

function requestSummary(stats?: RequestStats, ops?: Pick<OpsDashboardOverview, 'success_count' | 'request_count_sla'>) {
  const requests = isFiniteNumber(stats?.today_requests) ? Math.max(0, stats.today_requests) : undefined;
  // Prefer the server's explicit failure count and derive the rate from that
  // same count so the two labels can never disagree.
  const reportedFailures = isFiniteNumber(stats?.today_failed_requests) ? Math.max(0, stats.today_failed_requests) : undefined;
  if (requests === undefined) return { rate: '--', failed: reportedFailures };

  if (reportedFailures !== undefined) {
    const failed = Math.min(requests, reportedFailures);
    return { rate: requests > 0 ? `${(((requests - failed) / requests) * 100).toFixed(1)}%` : '--', failed };
  }

  const reportedSuccesses = isFiniteNumber(stats?.today_success_requests) ? Math.max(0, stats.today_success_requests) : undefined;
  if (reportedSuccesses !== undefined) {
    const successful = Math.min(requests, reportedSuccesses);
    return { rate: requests > 0 ? `${((successful / requests) * 100).toFixed(1)}%` : '--', failed: requests - successful };
  }

  // Official v0.2.13 dashboard stats do not include daily success/failure
  // counters. The already-loaded ops overview does include a real SLA window;
  // use it as a clearly scoped fallback instead of showing a fabricated daily rate.
  if (isFiniteNumber(ops?.request_count_sla) && ops.request_count_sla > 0 && isFiniteNumber(ops.success_count)) {
    const total = Math.max(0, ops.request_count_sla);
    const successful = Math.min(total, Math.max(0, ops.success_count));
    return { rate: `${((successful / total) * 100).toFixed(1)}%`, failed: total - successful, source: 'ops' as const };
  }

  return { rate: '--', failed: undefined as number | undefined };
}

function nonNegativeNumber(value?: number) {
  return isFiniteNumber(value) && value >= 0 ? value : undefined;
}

function formatUpdatedAt(timestamp?: number) {
  if (!timestamp) return '尚未同步';
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
}

function opsPercent(value?: number | null, digits = 1) {
  return isFiniteNumber(value) ? `${value.toFixed(digits)}%` : '--';
}

function opsRatioPercent(value?: number | null, digits = 2) {
  if (!isFiniteNumber(value)) return '--';
  // The official v0.2.13 service returns ratios (0..1). Accept an already
  // percent-shaped value as a compatibility guard for older Hub responses.
  return `${(value <= 1 ? value * 100 : value).toFixed(digits)}%`;
}

function opsNumber(value?: number | null) {
  return isFiniteNumber(value) ? new Intl.NumberFormat('zh-CN').format(value) : '--';
}

function opsStatus(data?: OpsDashboardOverview, error?: unknown) {
  if (!data) {
    if (error instanceof ApiError && error.code === 'OPS_DISABLED') return { label: '未启用', tone: 'warning' as const };
    if (error) return { label: '同步失败', tone: 'warning' as const };
    return { label: '同步中', tone: 'default' as const };
  }
  if (!isFiniteNumber(data.health_score)) return { label: '已连接', tone: 'success' as const };
  if (data.health_score >= 90) return { label: 'ONLINE', tone: 'success' as const };
  if (data.health_score >= 70) return { label: 'DEGRADED', tone: 'warning' as const };
  return { label: '风险', tone: 'warning' as const };
}

function opsMetricTone(value?: number | null, goodAt = 90) {
  if (!isFiniteNumber(value)) return 'default' as const;
  return value >= goodAt ? 'success' as const : 'warning' as const;
}

function opsRatioTone(value?: number | null, goodAt = 0.99, lowerIsBetter = false) {
  if (!isFiniteNumber(value)) return 'default' as const;
  return (lowerIsBetter ? value <= goodAt : value >= goodAt) ? 'success' as const : 'warning' as const;
}

function resourceStatus(value?: boolean | null) {
  if (value === true) return { value: '正常', tone: 'success' as const };
  if (value === false) return { value: '异常', tone: 'warning' as const };
  return { value: '--', tone: 'default' as const };
}

function heartbeatSummary(heartbeats?: OpsJobHeartbeat[] | null) {
  if (!heartbeats) return { value: '--', detail: '服务端未提供任务心跳', tone: 'default' as const };
  const healthy = heartbeats.filter((job) => !job.last_error_at).length;
  return { value: `${healthy}/${heartbeats.length}`, detail: heartbeats.length ? '最近心跳无错误' : '当前没有任务心跳', tone: healthy === heartbeats.length ? 'success' as const : 'warning' as const };
}

function memoryDetail(metrics?: OpsSystemMetricsSnapshot | null) {
  if (!metrics) return '系统指标未返回';
  if (isFiniteNumber(metrics.memory_used_mb) && isFiniteNumber(metrics.memory_total_mb)) return `${opsNumber(metrics.memory_used_mb)} / ${opsNumber(metrics.memory_total_mb)} MB`;
  return '内存容量未返回';
}

function OpsStatusItem({ icon: Icon, label, value, detail, tone = 'default' }: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
  tone?: 'default' | 'success' | 'warning';
}) {
  const color = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.text;
  const iconColor = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.primary;
  const iconBackground = tone === 'success' ? theme.successSoft : tone === 'warning' ? theme.warningSoft : theme.primarySoft;
  return <View style={{ flex: 1, minWidth: 0, backgroundColor: theme.cardRaised, borderRadius: 15, borderWidth: 1, borderColor: theme.border, padding: 11 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><View style={{ width: 26, height: 26, borderRadius: 9, backgroundColor: iconBackground, alignItems: 'center', justifyContent: 'center' }}><Icon color={iconColor} size={14} /></View><Text numberOfLines={1} style={{ flex: 1, color: theme.subtext, fontSize: 10 }}>{label}</Text></View>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={{ color, fontSize: 17, fontWeight: '900', marginTop: 9 }}>{value}</Text>
    <Text numberOfLines={2} style={{ color: theme.faint, fontSize: 9, lineHeight: 13, marginTop: 4 }}>{detail}</Text>
  </View>;
}

function DashboardMetric({ icon: Icon, label, value, detail, tone = 'default' }: { icon: typeof Activity; label: string; value: string; detail?: string; tone?: 'default' | 'success' | 'warning' }) {
  const color = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.text;
  const iconColor = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.primary;
  const iconBackground = tone === 'success' ? theme.successSoft : tone === 'warning' ? theme.warningSoft : theme.primarySoft;
  return <View style={{ width: '23%', minHeight: 123, backgroundColor: theme.card, borderRadius: 17, borderWidth: 1, borderColor: theme.border, padding: 10, shadowColor: '#7C95C7', shadowOpacity: 0.04, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}>
    <View style={{ width: 26, height: 26, borderRadius: 9, backgroundColor: iconBackground, alignItems: 'center', justifyContent: 'center' }}><Icon color={iconColor} size={14} /></View>
    <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.subtext, fontSize: 10, marginTop: 8 }}>{label}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={{ color, fontSize: 17, fontWeight: '900', marginTop: 5 }}>{value}</Text>
    {detail ? <Text numberOfLines={2} style={{ color: theme.faint, fontSize: 9, lineHeight: 13, marginTop: 5 }}>{detail}</Text> : null}
  </View>;
}

function QuickAction({ icon: Icon, title, subtitle, onPress, tone = 'primary' }: { icon: typeof UsersRound; title: string; subtitle: string; onPress: () => void; tone?: 'primary' | 'success' | 'warning' }) {
  const color = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.primary;
  const background = tone === 'success' ? theme.successSoft : tone === 'warning' ? theme.warningSoft : theme.primarySoft;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={`打开${title}`} onPress={onPress} style={({ pressed }) => ({ flexBasis: '48%', minWidth: 0, borderRadius: 18, backgroundColor: pressed ? theme.muted : theme.card, borderWidth: 1, borderColor: theme.border, padding: 10, opacity: pressed ? 0.86 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
    <View style={{ width: 30, height: 30, borderRadius: 11, backgroundColor: background, alignItems: 'center', justifyContent: 'center' }}><Icon color={color} size={15} /></View>
    <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.text, fontSize: 11, fontWeight: '900', marginTop: 8 }}>{title}</Text>
    <Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 9, lineHeight: 13, marginTop: 3 }}>{subtitle}</Text>
  </Pressable>;
}

export default function HomeScreen() {
  const stats = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats, staleTime: 30_000 });
  const payment = useQuery({ queryKey: ['admin-payment-dashboard'], queryFn: getAdminPaymentDashboard, staleTime: 30_000 });
  const settings = useQuery({ queryKey: ['admin-settings'], queryFn: getAdminSettings, staleTime: 120_000 });
  const version = useQuery({ queryKey: ['system-version'], queryFn: getSystemVersion, staleTime: 300_000 });
  const ops = useQuery({ queryKey: ['ops-dashboard-overview'], queryFn: () => getOpsDashboardOverview({ time_range: '1h' }), staleTime: 30_000 });
  const refresh = () => { void stats.refetch(); void payment.refetch(); void settings.refetch(); void version.refetch(); void ops.refetch(); };
  const data = stats.data;
  const paymentData = payment.data;
  const loading = stats.isLoading;
  const hasPrimaryData = Boolean(stats.data);
  const refreshError = stats.error || payment.error || settings.error || version.error || ops.error;
  const reportedAbnormal = nonNegativeNumber(data?.error_accounts);
  const abnormal = reportedAbnormal;
  const accountTone = abnormal === undefined ? 'default' : abnormal > 0 ? 'warning' : 'success';
  const accountDetail = abnormal === undefined
    ? `可用 ${number(nonNegativeNumber(data?.normal_accounts))}`
    : abnormal > 0
      ? `可用 ${number(nonNegativeNumber(data?.normal_accounts))} · 异常 ${number(abnormal)}`
      : `可用 ${number(nonNegativeNumber(data?.normal_accounts))} · 状态已同步`;
  const requestStatus = requestSummary(data, ops.data);
  const paymentAmount = amounts(paymentData?.today_amount);
  const paymentTone = payment.error || paymentAmount === '--' ? 'default' : 'success';
  const opsData = ops.data;
  const opsMetrics = opsData?.system_metrics;
  const opsState = opsStatus(opsData, ops.error);
  const healthTone = opsMetricTone(opsData?.health_score);
  const slaTone = isFiniteNumber(opsData?.sla) && (opsData.request_count_sla ?? 0) > 0 ? opsRatioTone(opsData.sla <= 1 ? opsData.sla : opsData.sla / 100) : 'default';
  const dbState = resourceStatus(opsMetrics?.db_ok);
  const redisState = resourceStatus(opsMetrics?.redis_ok);
  const jobsState = heartbeatSummary(opsData?.job_heartbeats);
  const opsSubtitle = opsData
    ? `近 1 小时 · 官方监控接口已返回${version.data?.version ? ` · ${version.data.version}` : ''}`
    : ops.error instanceof ApiError && ops.error.code === 'OPS_DISABLED'
      ? '服务器未启用官方运维监控'
      : ops.error
        ? '官方运维监控暂不可用'
        : '等待官方运维监控响应';
  return <Page title="管理员控制台" subtitle={`${settings.data?.site_name || 'Vexlune Hub'} · 管理员专用`} refreshing={[stats, payment, settings, version, ops].some((query) => query.isRefetching)} onRefresh={refresh}>
    <StateCard loading={loading} error={!hasPrimaryData ? refreshError : undefined} onRetry={refresh} />
    {!loading && (hasPrimaryData || !refreshError) ? <>
      <RefreshError error={hasPrimaryData ? refreshError : undefined} onRetry={refresh} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 1, marginBottom: 2 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 17, fontWeight: '900' }}>今日概览</Text>
          <Text style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }}>{`数据更新于 ${formatUpdatedAt(stats.dataUpdatedAt)} · 服务版本 ${version.data?.version || '读取中'}`}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="refresh-dashboard" onPress={refresh} disabled={stats.isRefetching} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 13, backgroundColor: theme.cardRaised, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', opacity: pressed || stats.isRefetching ? 0.65 : 1 })}>
          <RefreshCw color={theme.primary} size={17} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }}>
        <DashboardMetric icon={CircleDollarSign} label="充值实收" value={paymentAmount} detail={paymentMetricDetail(paymentData, payment.error)} tone={paymentTone} />
        <DashboardMetric icon={CircleDollarSign} label="余额消费" value={money(data?.today_actual_cost)} detail={isFiniteNumber(data?.today_actual_cost) ? '今日实际扣费' : '服务端未提供实际扣费'} tone={isFiniteNumber(data?.today_actual_cost) ? 'warning' : 'default'} />
        <DashboardMetric icon={Activity} label="请求量" value={number(data?.today_requests)} detail="今日" />
        <DashboardMetric icon={Layers3} label="今日 Token" value={formatOptionalTokenValue(data?.today_tokens)} detail="输入与输出总量" />
        <DashboardMetric icon={Server} label="上游账号" value={number(data?.total_accounts)} detail={accountDetail} tone={accountTone} />
        <DashboardMetric icon={UsersRound} label="总用户" value={number(data?.total_users)} detail={`今日新增 ${number(data?.today_new_users)}`} />
        <DashboardMetric icon={UsersRound} label="活跃用户" value={number(data?.active_users)} tone="success" />
        <DashboardMetric icon={CircleCheck} label="请求成功率" value={requestStatus.rate} detail={requestStatus.failed === undefined ? '官方统计未提供成功/失败计数' : requestStatus.source === 'ops' ? `近 1 小时 SLA · 失败 ${number(requestStatus.failed)}` : `失败 ${number(requestStatus.failed)}`} tone={requestStatus.rate === '--' ? 'default' : 'success'} />
      </View>

      <SectionTitle title="快捷操作" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 8, rowGap: 8 }}>
        <QuickAction icon={UsersRound} title="用户" subtitle="状态与权限" onPress={() => router.push('/users')} />
        <QuickAction icon={KeyRound} title="上游账号" subtitle="节点与凭据" onPress={() => router.push('/accounts')} />
        <QuickAction icon={Layers3} title="分组" subtitle="模型与倍率" onPress={() => router.push('/groups')} />
        <QuickAction icon={Megaphone} title="公告" subtitle="系统通知" tone="warning" onPress={() => router.push('/admin-announcements')} />
        <QuickAction icon={ReceiptText} title="订单" subtitle="履约与退款" onPress={() => router.push('/admin-orders')} />
        <QuickAction icon={CircleAlert} title="异常" subtitle="失败请求与账号" tone="warning" onPress={() => router.push('/exceptions')} />
        <QuickAction icon={FileClock} title="使用记录" subtitle="请求与 Token" onPress={() => router.push('/logs')} />
        <QuickAction icon={ClipboardCheck} title="审计日志" subtitle="管理员操作记录" onPress={() => router.push('/admin-security')} />
      </View>

      <SectionTitle title="服务状态" action={<Pressable accessibilityRole="button" accessibilityLabel="查看运维监控" hitSlop={8} onPress={() => router.push('/monitor')} style={({ pressed }) => ({ opacity: pressed ? 0.62 : 1 })}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '900' }}>查看监控</Text></Pressable>} />
      <Card style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: opsState.tone === 'success' ? theme.successSoft : theme.warningSoft, alignItems: 'center', justifyContent: 'center' }}><Server color={opsState.tone === 'success' ? theme.success : theme.warning} size={18} /></View>
          <View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '900' }}>Sub2API 运维状态</Text><Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }}>{opsSubtitle}</Text></View>
          <Badge label={opsState.label} tone={opsState.tone === 'default' ? 'muted' : opsState.tone} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 13 }}>
          <OpsStatusItem icon={CircleCheck} label="健康评分" value={opsNumber(opsData?.health_score)} detail="官方运维评分 / 100" tone={healthTone} />
          <OpsStatusItem icon={Activity} label="QPS / TPS" value={isFiniteNumber(opsData?.qps?.current) ? opsData.qps.current.toFixed(1) : '--'} detail={isFiniteNumber(opsData?.tps?.current) ? `TPS ${opsData.tps.current.toFixed(1)} · 峰值 ${opsData.tps.peak?.toFixed(1) ?? '--'}` : '吞吐指标未返回'} tone={opsData ? 'success' : 'default'} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <OpsStatusItem icon={CircleCheck} label="SLA" value={opsData && (opsData.request_count_sla ?? 0) > 0 ? opsRatioPercent(opsData.sla, 3) : '--'} detail={opsData ? `窗口请求 ${opsNumber(opsData.request_count_sla)}` : '官方 SLA 未返回'} tone={slaTone} />
          <OpsStatusItem icon={Activity} label="错误率" value={opsRatioPercent(opsData?.error_rate, 3)} detail={opsData ? `上游 ${opsRatioPercent(opsData.upstream_error_rate, 3)}` : '错误指标未返回'} tone={opsData ? opsRatioTone(opsData.error_rate, 0.01, true) : 'default'} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <OpsStatusItem icon={Activity} label="请求延迟 P99" value={opsNumber(opsData?.duration?.p99_ms)} detail={isFiniteNumber(opsData?.duration?.p99_ms) ? '毫秒 · 近 1 小时' : '延迟指标未返回'} tone={opsData ? 'success' : 'default'} />
          <OpsStatusItem icon={Activity} label="首字延迟 P99" value={opsNumber(opsData?.ttft?.p99_ms)} detail={isFiniteNumber(opsData?.ttft?.p99_ms) ? '毫秒 · 近 1 小时' : 'TTFT 指标未返回'} tone={opsData ? 'success' : 'default'} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <OpsStatusItem icon={Activity} label="CPU" value={opsPercent(opsMetrics?.cpu_usage_percent)} detail="主机快照 · 官方监控" tone={opsMetrics ? 'success' : 'default'} />
          <OpsStatusItem icon={Activity} label="内存" value={opsPercent(opsMetrics?.memory_usage_percent)} detail={memoryDetail(opsMetrics)} tone={opsMetrics ? 'success' : 'default'} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <OpsStatusItem icon={Server} label="数据库" value={dbState.value} detail={isFiniteNumber(opsMetrics?.db_conn_active) ? `活动连接 ${opsNumber(opsMetrics.db_conn_active)}` : '连接指标未返回'} tone={dbState.tone} />
          <OpsStatusItem icon={Server} label="Redis" value={redisState.value} detail={isFiniteNumber(opsMetrics?.redis_conn_total) ? `连接 ${opsNumber(opsMetrics.redis_conn_total)}` : '连接指标未返回'} tone={redisState.tone} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <OpsStatusItem icon={Activity} label="协程 / 队列" value={opsNumber(opsMetrics?.goroutine_count)} detail={isFiniteNumber(opsMetrics?.concurrency_queue_depth) ? `排队 ${opsNumber(opsMetrics.concurrency_queue_depth)}` : '队列指标未返回'} tone={opsMetrics ? 'success' : 'default'} />
          <OpsStatusItem icon={RefreshCw} label="后台任务" value={jobsState.value} detail={jobsState.detail} tone={jobsState.tone} />
        </View>
        <Text style={{ color: theme.faint, fontSize: 10, lineHeight: 15, marginTop: 11 }}>状态依据官方 Sub2API 运维接口返回；未启用监控或未返回的指标显示为 --，不推断数据库、Redis 或主机状态。</Text>
      </Card>
    </> : null}
  </Page>;
}
