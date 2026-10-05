import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Activity, CircleDollarSign, Clock3, FileText, RefreshCw, RotateCcw, XCircle } from 'lucide-react-native';

import { Badge, Card, Metric, Page, SectionTitle, StateCard } from '@/src/components/ui';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { formatOptionalNumber } from '@/src/lib/formatters';
import { newIdempotencyKey } from '@/src/lib/idempotency';
import { cancelAdminPaymentOrder, getAdminPaymentDashboard, listAdminPaymentOrders, queryAdminPaymentRefund, refundAdminPaymentOrder, retryAdminPaymentOrder, type AdminPaymentOrder } from '@/src/services/admin-extended';
import { theme } from '@/src/theme';

type OrderFilter = '' | 'PENDING' | 'PAID' | 'REFUNDED';

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'PAID', label: '已支付' },
  { value: 'PENDING', label: '待处理' },
  { value: 'REFUNDED', label: '已退款' },
];

function formatAmounts(amounts?: Record<string, number>) {
  const entries = Object.entries(amounts ?? {}).filter(([, value]) => typeof value === 'number' && Number.isFinite(value));
  if (!entries.length) return '--';
  return entries.map(([currency, value]) => {
    try {
      return new Intl.NumberFormat('zh-CN', { style: 'currency', currency }).format(value);
    } catch {
      return `${currency} ${value.toFixed(2)}`;
    }
  }).join(' · ');
}

function formatOrderAmount(value: unknown, currency?: string) {
  if (value === null || value === undefined || value === '') return '--';
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  if (!currency) return `${number.toFixed(4)}（币种未返回）`;
  try {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency }).format(number);
  } catch {
    return `${currency} ${number.toFixed(4)}`;
  }
}

function formatCreditedAmount(value: unknown) {
  if (value === null || value === undefined || value === '') return '--';
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'USD' }).format(number) : '--';
}

function statusLabel(status?: string) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PAID' || normalized === 'COMPLETED') return { label: '已完成', tone: 'success' as const };
  if (normalized.includes('REFUND')) return { label: normalized === 'REFUNDED' ? '已退款' : '退款处理中', tone: 'warning' as const };
  if (normalized === 'PENDING' || normalized === 'RECHARGING') return { label: '待处理', tone: 'primary' as const };
  if (normalized === 'FAILED' || normalized === 'CANCELLED' || normalized === 'EXPIRED') return { label: '已关闭', tone: 'danger' as const };
  return { label: status || '--', tone: 'muted' as const };
}

function paymentLabel(type?: string) {
  const labels: Record<string, string> = { stripe: 'Stripe', alipay: '支付宝', alipay_direct: '支付宝', wxpay: '微信支付', wxpay_direct: '微信支付', easypay: 'EasyPay', airwallex: 'Airwallex' };
  return labels[String(type || '').toLowerCase()] || type || '--';
}

export default function AdminOrdersScreen() {
  const client = useQueryClient();
  const actionKeys = useRef<Record<string, string>>({});
  const [status, setStatus] = useState<OrderFilter>('');
  const dashboard = useQuery({ queryKey: ['admin-payment-dashboard'], queryFn: getAdminPaymentDashboard, staleTime: 30_000 });
  const orders = useQuery({ queryKey: ['admin-payment-orders', status], queryFn: () => listAdminPaymentOrders({ page_size: 30, status: status || undefined }), staleTime: 30_000 });
  const action = useMutation({ mutationFn: ({ type, id, idempotencyKey }: { type: 'cancel' | 'retry' | 'refund' | 'refund-query'; id: number; idempotencyKey: string }) => type === 'cancel' ? cancelAdminPaymentOrder(id, idempotencyKey) : type === 'retry' ? retryAdminPaymentOrder(id, idempotencyKey) : type === 'refund-query' ? queryAdminPaymentRefund(id, idempotencyKey) : refundAdminPaymentOrder(id, { reason: '管理员在移动端发起退款', force: false, deduct_balance: true }, idempotencyKey), onSuccess: (_result, input) => { delete actionKeys.current[`${input.type}:${input.id}`]; void client.invalidateQueries({ queryKey: ['admin-payment-dashboard'] }); void client.invalidateQueries({ queryKey: ['admin-payment-orders'] }); } });
  const data = dashboard.data;
  const items = orders.data?.items ?? [];

  function confirm(item: AdminPaymentOrder, type: 'cancel' | 'retry' | 'refund') {
    const labels = { cancel: '取消订单', retry: '重试履约', refund: '发起退款' };
    Alert.alert(labels[type], `订单 ${item.out_trade_no || item.id} 将由服务端执行“${labels[type]}”。`, [{ text: '取消', style: 'cancel' }, { text: '确认', style: type === 'refund' ? 'destructive' : 'default', onPress: () => { const key = `${type}:${item.id}`; if (!actionKeys.current[key]) actionKeys.current[key] = newIdempotencyKey(`admin-payment-${type}-${item.id}`); action.mutate({ type, id: item.id, idempotencyKey: actionKeys.current[key] }); } }]);
  }

  function queryRefund(item: AdminPaymentOrder) {
    const key = `refund-query:${item.id}`;
    if (!actionKeys.current[key]) actionKeys.current[key] = newIdempotencyKey(`admin-payment-refund-query-${item.id}`);
    action.mutate({ type: 'refund-query', id: item.id, idempotencyKey: actionKeys.current[key] });
  }

  const daily = data?.daily_series ?? [];
  const dailyCounts = daily.map((point) => point.count).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const maxDaily = Math.max(...dailyCounts, 1);

  return <Page title="订单与收入" subtitle="支付概览 · 账单流水 · 退款处理" refreshing={dashboard.isRefetching || orders.isRefetching} onRefresh={() => { void dashboard.refetch(); void orders.refetch(); }}>
    {dashboard.error || orders.error ? <Text style={{ color: theme.danger }}>{humanizeApiError(dashboard.error || orders.error)}</Text> : null}
    {action.error ? <Text style={{ color: theme.danger }}>{humanizeApiError(action.error)}</Text> : null}

    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Metric icon={CircleDollarSign} label="今日实付" value={formatAmounts(data?.today_amount)} tone="success" />
      <Metric icon={FileText} label="今日订单" value={formatOptionalNumber(data?.today_count)} />
      <Metric icon={Clock3} label="待处理" value={formatOptionalNumber(data?.pending_orders)} tone="warning" />
      <Metric icon={Activity} label="累计实付" value={formatAmounts(data?.total_amount)} />
    </View>
    <Text style={{ color: theme.faint, fontSize: 10, lineHeight: 15, marginTop: 8 }}>实付统计读取服务端 pay_amount 与订单币种；订单卡片同时标明到账额度（amount，官方按 USD 计价）。“--”表示字段未返回，“0”表示服务端明确返回 0。</Text>

    <SectionTitle title="近 30 天订单趋势" action={daily.length ? `共 ${formatOptionalNumber(data?.total_count)} 单` : undefined} />
    <Card>
      {daily.length ? <><View style={{ height: 112, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>{daily.slice(-30).map((point, index) => <View key={`${point.date}-${index}`} accessibilityLabel={`order-trend-${index}`} style={{ flex: 1, minHeight: 4, height: `${typeof point.count === 'number' && Number.isFinite(point.count) ? Math.max(5, (point.count / maxDaily) * 100) : 4}%`, borderRadius: 4, backgroundColor: typeof point.count !== 'number' || !Number.isFinite(point.count) ? theme.muted : index === daily.slice(-30).length - 1 ? theme.primary : theme.primarySoft }} />)}</View><View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 }}><Text style={{ color: theme.faint, fontSize: 10 }}>{daily[0]?.date?.slice(5) || '--'}</Text><Text style={{ color: theme.faint, fontSize: 10 }}>{daily[daily.length - 1]?.date?.slice(5) || '--'}</Text></View><Text style={{ color: theme.subtext, fontSize: 11, marginTop: 8 }}>每日订单数量（按服务端支付统计返回）</Text></> : <Text style={{ color: theme.subtext, textAlign: 'center', paddingVertical: 24 }}>当前时间范围没有趋势数据</Text>}
    </Card>

    <SectionTitle title="订单列表" action={<Text style={{ color: theme.subtext, fontSize: 12 }}>{orders.data ? `共 ${formatOptionalNumber(orders.data.total)} 条` : '正在统计'}</Text>} />
    <View style={{ flexDirection: 'row', gap: 5, borderRadius: 17, backgroundColor: theme.cardRaised, borderWidth: 1, borderColor: theme.border, padding: 4, marginBottom: 12 }}>{FILTERS.map((filter) => <Pressable key={filter.value || 'all'} onPress={() => setStatus(filter.value)} style={{ flex: 1, alignItems: 'center', borderRadius: 13, backgroundColor: status === filter.value ? theme.primary : 'transparent', paddingVertical: 9 }}><Text style={{ color: status === filter.value ? '#FFFFFF' : theme.subtext, fontSize: 11, fontWeight: '900' }}>{filter.label}</Text></Pressable>)}</View>
    <StateCard loading={orders.isLoading} error={orders.error} empty={!orders.isLoading && !orders.error && items.length === 0} onRetry={() => void orders.refetch()} emptyText="当前筛选条件下没有订单。" />
    <View style={{ gap: 10 }}>{items.map((item) => {
      const normalized = String(item.status || '').toUpperCase();
      const state = statusLabel(item.status);
      const canCancel = normalized === 'PENDING';
      const canRetry = normalized === 'FAILED';
      const canRefund = ['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUND_REQUESTED', 'REFUND_FAILED'].includes(normalized);
      const refundPending = normalized === 'REFUND_PENDING' || normalized === 'REFUNDING';
      return <Card key={item.id} style={{ padding: 15 }}><View style={{ flexDirection: 'row', gap: 11, alignItems: 'flex-start' }}><View style={{ width: 39, height: 39, borderRadius: 13, backgroundColor: state.tone === 'danger' ? theme.dangerSoft : state.tone === 'warning' ? theme.warningSoft : theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}><CircleDollarSign color={state.tone === 'danger' ? theme.danger : state.tone === 'warning' ? theme.warning : theme.primary} size={18} /></View><View style={{ flex: 1, minWidth: 0 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontWeight: '900' }}>#{item.out_trade_no || item.id}</Text><Badge label={state.label} tone={state.tone} /></View><Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>{item.user_email || item.user_name || '--'} · {paymentLabel(item.payment_type)}</Text><Text style={{ color: theme.text, fontSize: 12, fontWeight: '800', marginTop: 7 }}>实付：{formatOrderAmount(item.pay_amount, item.currency)}</Text><Text style={{ color: theme.faint, fontSize: 11, marginTop: 3 }}>到账额度：{formatCreditedAmount(item.amount)} · {item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : '--'}</Text></View><Pressable accessibilityLabel="refresh-orders" onPress={() => void orders.refetch()} style={{ padding: 7 }}><RefreshCw color={theme.primary} size={16} /></Pressable></View>{canCancel || canRetry || canRefund || refundPending ? <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>{canCancel ? <Pressable disabled={action.isPending} onPress={() => confirm(item, 'cancel')} style={{ flex: 1, borderRadius: 10, paddingVertical: 9, backgroundColor: theme.dangerSoft, alignItems: 'center' }}><XCircle color={theme.danger} size={14} /><Text style={{ color: theme.danger, fontSize: 12, fontWeight: '800' }}>取消</Text></Pressable> : null}{canRetry ? <Pressable disabled={action.isPending} onPress={() => confirm(item, 'retry')} style={{ flex: 1, borderRadius: 10, paddingVertical: 9, backgroundColor: theme.primarySoft, alignItems: 'center' }}><RotateCcw color={theme.primary} size={14} /><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>重试履约</Text></Pressable> : null}{canRefund ? <Pressable disabled={action.isPending} onPress={() => confirm(item, 'refund')} style={{ flex: 1, borderRadius: 10, paddingVertical: 9, backgroundColor: theme.warningSoft, alignItems: 'center' }}><Text style={{ color: theme.warning, fontSize: 12, fontWeight: '800' }}>退款</Text></Pressable> : null}{refundPending ? <Pressable disabled={action.isPending} onPress={() => queryRefund(item)} style={{ flex: 1, borderRadius: 10, paddingVertical: 9, backgroundColor: theme.warningSoft, alignItems: 'center' }}><Text style={{ color: theme.warning, fontSize: 12, fontWeight: '800' }}>查询退款状态</Text></Pressable> : null}</View> : null}</Card>;
    })}</View>
  </Page>;
}
