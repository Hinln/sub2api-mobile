import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Activity, AlertTriangle, Bell, ChevronRight, CircleCheck, CircleDollarSign, KeyRound, Layers3, RefreshCw, Server, UsersRound } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Badge, Card, Page, RefreshError, SectionTitle, StateCard } from '@/src/components/ui';
import { formatOptionalNumber, formatOptionalTokenValue } from '@/src/lib/formatters';
import { getAdminSettings, getDashboardStats, getDashboardTrend, getSystemVersion, listAccounts, listRequestErrors } from '@/src/services/admin';
import { getAdminPaymentDashboard } from '@/src/services/admin-extended';
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

function firstAmountEntry(value?: Record<string, number>) {
  const entry = Object.entries(value ?? {}).find(([, amount]) => typeof amount === 'number' && Number.isFinite(amount));
  return entry ? { currency: entry[0], amount: entry[1] } : null;
}

function formatAmountEntry(entry: { currency: string; amount: number }) {
  try {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: entry.currency }).format(entry.amount);
  } catch {
    return `${entry.currency} ${entry.amount.toFixed(2)}`;
  }
}

function paymentMetricDetail(data?: { today_amount?: Record<string, number>; today_count?: number }, error?: unknown) {
  if (error) return '支付接口暂不可用';
  if (!data) return '支付统计未返回';
  const count = formatOptionalNumber(data.today_count);
  return `${count} 笔订单 · ${amounts(data.today_amount) === '--' ? '实收未提供' : '服务端统计'}`;
}

type RequestStats = { today_requests?: number; today_success_requests?: number; today_failed_requests?: number };

function requestSummary(stats?: RequestStats) {
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

  return { rate: '--', failed: undefined as number | undefined };
}

function nonNegativeNumber(value?: number) {
  return isFiniteNumber(value) && value >= 0 ? value : undefined;
}

function accountHasError(item: { status?: string; error_message?: string | null }) {
  return item.status === 'error' || Boolean(item.error_message);
}

function formatUpdatedAt(timestamp?: number) {
  if (!timestamp) return '尚未同步';
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
}

function localDateKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

type TrendBarPoint = { date: string; value?: number; valueLabel?: string };

function formatTrendValue(value: number) {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value);
}

function formatTrendDate(value: string) {
  if (value === localDateKey(new Date())) return '今天';
  const match = /^(?:\d{4}-)?(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[1]}/${match[2]}` : value.slice(0, 10);
}

function TrendBars({ points, unit }: { points: TrendBarPoint[]; unit: string }) {
  const visible = points.slice(-7);
  const values = visible.map((point) => point.value).filter(isFiniteNumber);
  const maxValue = Math.max(...values, 0);
  const scaleMax = maxValue || 1;
  const [selectedDate, setSelectedDate] = useState<string>();
  const selected = visible.find((point) => point.date === selectedDate) ?? visible[visible.length - 1];

  if (!visible.length || !values.length) return <Text style={{ color: theme.subtext, textAlign: 'center', paddingVertical: 22 }}>当前时间范围没有可用的趋势数据</Text>;

  return <View accessibilityLabel="dashboard-trend" accessibilityHint="点击柱查看对应日期的统计" style={{ marginTop: 2 }}>
    <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
      <View style={{ width: 42, height: 148, justifyContent: 'space-between', paddingBottom: 25 }}>
        {[maxValue, maxValue / 2, 0].map((tick, index) => <Text key={`${tick}-${index}`} style={{ color: theme.faint, fontSize: 9, textAlign: 'right' }}>{formatTrendValue(tick)}{index === 0 ? ` ${unit}` : ''}</Text>)}
      </View>
      <View style={{ flex: 1, marginLeft: 8 }}>
        <View style={{ height: 116, flexDirection: 'row', alignItems: 'stretch', gap: 4 }}>
          {visible.map((point) => {
            const selectedPoint = point.date === selected?.date;
            const hasValue = isFiniteNumber(point.value);
            const barHeight = hasValue ? Math.max(5, (point.value! / scaleMax) * 100) : 4;
            const valueLabel = point.valueLabel ?? (hasValue ? formatTrendValue(point.value!) : '未获取');
            return <Pressable key={point.date} accessibilityRole="button" accessibilityLabel={`${point.date} ${valueLabel}${hasValue ? ` ${unit}` : ''}`} accessibilityState={{ selected: selectedPoint }} onPress={() => setSelectedDate(point.date)} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'stretch' }}>
              <View style={{ minHeight: 4, height: `${barHeight}%`, borderRadius: 5, backgroundColor: !hasValue ? theme.muted : selectedPoint ? theme.primary : theme.primarySoft, borderWidth: selectedPoint && hasValue ? 1 : 0, borderColor: theme.primary }} />
            </Pressable>;
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 7 }}>
          {visible.map((point) => <Text key={`${point.date}-label`} numberOfLines={1} style={{ flex: 1, color: theme.faint, fontSize: 9, textAlign: 'center' }}>{formatTrendDate(point.date)}</Text>)}
        </View>
      </View>
    </View>
    <Text style={{ color: theme.text, fontSize: 11, fontWeight: '800', marginTop: 10 }}>{selected ? `选中 ${selected.date} · ${selected.valueLabel ?? (isFiniteNumber(selected.value) ? formatTrendValue(selected.value) : '未获取')}${isFiniteNumber(selected.value) ? ` ${unit}` : ''}` : ''}</Text>
    <Text style={{ color: theme.subtext, fontSize: 10, marginTop: 4 }}>每柱为当日合计 · 单位：{unit} · 灰色表示未获取 · 点击柱查看详情</Text>
  </View>;
}

type HomeTrendMetric = 'requests' | 'tokens' | 'revenue';

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
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  const range = { start_date: localDateKey(start), end_date: localDateKey(today), granularity: 'day' as const };
  const trend = useQuery({ queryKey: ['dashboard-trend-home', range.start_date, range.end_date], queryFn: () => getDashboardTrend(range), staleTime: 30_000 });
  const refresh = () => { void stats.refetch(); void payment.refetch(); void settings.refetch(); void version.refetch(); void accounts.refetch(); void failures.refetch(); void trend.refetch(); };
  const data = stats.data;
  const paymentData = payment.data;
  const accountItems = accounts.data?.items ?? [];
  const loading = stats.isLoading || accounts.isLoading;
  const error = stats.error || accounts.error;
  const hasPrimaryData = Boolean(stats.data || accounts.data);
  const refreshError = error || payment.error || settings.error || version.error || failures.error || trend.error;
  const listedAbnormal = accountItems.filter(accountHasError).length;
  // The dashboard aggregate can lag behind the account list. Keep a concrete
  // row-level error visible instead of masking it with a stale aggregate zero.
  // When the list is the only evidence, the supporting label below names its
  // current-page scope rather than implying a whole-instance total.
  const reportedAbnormal = nonNegativeNumber(data?.error_accounts);
  const abnormal = reportedAbnormal === undefined ? (listedAbnormal > 0 ? listedAbnormal : undefined) : Math.max(reportedAbnormal, listedAbnormal);
  const abnormalScope = listedAbnormal > 0 && (reportedAbnormal === undefined || listedAbnormal > reportedAbnormal) ? '当前页异常' : '异常';
  const accountTone = abnormal === undefined ? 'default' : abnormal > 0 ? 'warning' : 'success';
  const accountDetail = abnormal === undefined
    ? `可用 ${number(nonNegativeNumber(data?.normal_accounts))}`
    : abnormal > 0
      ? `可用 ${number(nonNegativeNumber(data?.normal_accounts))} · ${abnormalScope} ${number(abnormal)}`
      : `可用 ${number(nonNegativeNumber(data?.normal_accounts))} · 状态已同步`;
  const requestStatus = requestSummary(data);
  const paymentAmount = amounts(paymentData?.today_amount);
  const paymentTone = payment.error || paymentAmount === '--' ? 'default' : 'success';
  const trendPoints: TrendBarPoint[] = trendMetric === 'requests'
    ? (trend.data?.trend ?? []).map((point) => ({ date: point.date, value: isFiniteNumber(point.requests) ? point.requests : undefined }))
    : trendMetric === 'tokens'
      ? (trend.data?.trend ?? []).map((point) => ({ date: point.date, value: isFiniteNumber(point.total_tokens) ? point.total_tokens : undefined }))
      : (paymentData?.daily_series ?? []).map((point) => {
        const entry = firstAmountEntry(point.amount);
        return entry ? { date: point.date, value: entry.amount, valueLabel: formatAmountEntry(entry) } : { date: point.date, value: undefined };
      });
  const trendTitle = trendMetric === 'requests' ? '请求量' : trendMetric === 'tokens' ? 'Token' : '充值实收';
  const trendUnit = trendMetric === 'requests' ? '次' : trendMetric === 'tokens' ? 'Token' : '支付金额';
  const trendTodayLabel = trendMetric === 'requests'
    ? `今日 ${number(data?.today_requests)} 次`
    : trendMetric === 'tokens'
      ? `今日 ${formatOptionalTokenValue(data?.today_tokens)} Token`
      : `今日 ${amounts(paymentData?.today_amount)}`;

  return <Page title="管理员控制台" subtitle={`${settings.data?.site_name || 'Vexlune Hub'} · 管理员专用`} refreshing={[stats, payment, settings, version, accounts, failures, trend].some((query) => query.isRefetching)} onRefresh={refresh}>
    <StateCard loading={loading} error={!hasPrimaryData ? refreshError : undefined} onRetry={refresh} />
    {!loading && (hasPrimaryData || !refreshError) ? <>
      <RefreshError error={hasPrimaryData ? refreshError : undefined} onRetry={refresh} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 1, marginBottom: 2 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 17, fontWeight: '900' }}>今日概览</Text>
          <Text style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }}>{`数据更新于 ${formatUpdatedAt(stats.dataUpdatedAt)} · 服务版本 ${version.data?.version || '读取中'}`}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="refresh-dashboard" onPress={refresh} disabled={stats.isRefetching || accounts.isRefetching} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 13, backgroundColor: theme.cardRaised, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', opacity: pressed || stats.isRefetching || accounts.isRefetching ? 0.65 : 1 })}>
          <RefreshCw color={theme.primary} size={17} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }}>
        <DashboardMetric icon={Activity} label="请求量" value={number(data?.today_requests)} detail="今日" />
        <DashboardMetric icon={Layers3} label="今日 Token" value={formatOptionalTokenValue(data?.today_tokens)} detail="输入与输出总量" />
        <DashboardMetric icon={CircleDollarSign} label="充值实收" value={paymentAmount} detail={paymentMetricDetail(paymentData, payment.error)} tone={paymentTone} />
        <DashboardMetric icon={CircleDollarSign} label="余额消费" value={money(data?.today_actual_cost)} detail={isFiniteNumber(data?.today_actual_cost) ? '今日实际扣费' : '服务端未提供实际扣费'} tone={isFiniteNumber(data?.today_actual_cost) ? 'warning' : 'default'} />
        <DashboardMetric icon={Server} label="上游账号" value={number(data?.total_accounts)} detail={accountDetail} tone={accountTone} />
        <DashboardMetric icon={UsersRound} label="总用户" value={number(data?.total_users)} detail={`今日新增 ${number(data?.today_new_users)}`} />
        <DashboardMetric icon={UsersRound} label="活跃用户" value={number(data?.active_users)} tone="success" />
        <DashboardMetric icon={CircleCheck} label="请求成功率" value={requestStatus.rate} detail={requestStatus.failed === undefined ? '明细未获取' : `失败 ${number(requestStatus.failed)}`} tone={requestStatus.rate === '--' ? 'default' : 'success'} />
      </View>

      <SectionTitle title="服务状态" action={<Pressable onPress={() => router.push('/accounts')}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '900' }}>查看全部</Text></Pressable>} />
      <View style={{ gap: 9 }}>{accountItems.slice(0, 3).map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`查看账号 ${item.name}`} onPress={() => router.push(`/accounts/${item.id}`)}><Card style={{ paddingVertical: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}><View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: accountHasError(item) ? theme.dangerSoft : theme.successSoft, alignItems: 'center', justifyContent: 'center' }}><Server color={accountHasError(item) ? theme.danger : theme.success} size={18} /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: theme.text, fontWeight: '900' }}>{item.name}</Text><Text style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }}>{`${item.platform} · ${number(item.current_concurrency)}/${number(item.concurrency)} 并发`}</Text></View><Badge label={accountHasError(item) ? '异常' : item.schedulable === false ? '已停用' : '运行中'} tone={accountHasError(item) ? 'danger' : item.schedulable === false ? 'muted' : 'success'} /><ChevronRight color={theme.faint} size={17} /></View></Card></Pressable>)}{!accountItems.length ? <Card><Text style={{ color: theme.subtext, textAlign: 'center' }}>暂无上游账号数据</Text></Card> : null}</View>


      <Card style={{ marginTop: 16 }}><View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 17, fontWeight: '900' }}>近 7 天趋势</Text><Text style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }}>{`${trendTitle} · 每柱为当日合计 · ${range.start_date.slice(5)}–${range.end_date.slice(5)}（含今日）`}</Text></View><Badge label={trendTodayLabel} tone="primary" /></View><View style={{ flexDirection: 'row', gap: 5, borderRadius: 14, backgroundColor: theme.cardRaised, borderWidth: 1, borderColor: theme.border, padding: 4, marginTop: 14 }}>{([['requests', '请求量'], ['tokens', 'Token'], ['revenue', '充值实收']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: trendMetric === value }} onPress={() => setTrendMetric(value)} style={{ flex: 1, alignItems: 'center', borderRadius: 10, backgroundColor: trendMetric === value ? theme.primary : 'transparent', paddingVertical: 8 }}><Text style={{ color: trendMetric === value ? '#FFFFFF' : theme.subtext, fontSize: 10, fontWeight: '900' }}>{label}</Text></Pressable>)}</View><TrendBars points={trendPoints} unit={trendUnit} /></Card>

      <SectionTitle title="快捷操作" />
      <View style={{ flexDirection: 'row', gap: 8 }}><QuickAction icon={UsersRound} title="用户" subtitle="状态与权限" onPress={() => router.push('/users')} /><QuickAction icon={KeyRound} title="账号" subtitle="节点与凭据" onPress={() => router.push('/accounts')} /><QuickAction icon={Layers3} title="分组" subtitle="模型与倍率" onPress={() => router.push('/groups')} /><QuickAction icon={Bell} title="公告" subtitle="系统通知" tone="warning" onPress={() => router.push('/admin-announcements')} /></View>

      {failures.data?.items?.length ? <><SectionTitle title="最近需要处理" action={<Pressable onPress={() => router.push('/exceptions')}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '900' }}>查看全部</Text></Pressable>} /><View style={{ gap: 9 }}>{failures.data.items.map((item) => <Pressable key={item.id} onPress={() => router.push('/exceptions')}><Card style={{ paddingVertical: 12 }}><View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><AlertTriangle color={theme.danger} size={17} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: theme.text, fontWeight: '800' }}>{item.model || item.request_path || `Request #${item.id}`}</Text><Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }}>{item.message || `HTTP ${item.status_code ?? '--'}`}</Text></View><ChevronRight color={theme.faint} size={17} /></View></Card></Pressable>)}</View></> : null}
    </> : null}
  </Page>;
}
