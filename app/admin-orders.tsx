import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { CircleDollarSign, RefreshCw } from 'lucide-react-native';

import { Card, Metric, Page, StateCard } from '@/src/components/ui';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { formatOptionalMoney, formatOptionalNumber } from '@/src/lib/formatters';
import { newIdempotencyKey } from '@/src/lib/idempotency';
import { cancelAdminPaymentOrder, getAdminPaymentDashboard, listAdminPaymentOrders, refundAdminPaymentOrder, retryAdminPaymentOrder, type AdminPaymentOrder } from '@/src/services/admin-extended';
import { theme } from '@/src/theme';

export default function AdminOrdersScreen() {
  const client = useQueryClient();
  const actionKeys = useRef<Record<string, string>>({});
  const dashboard = useQuery({ queryKey: ['admin-payment-dashboard'], queryFn: getAdminPaymentDashboard, staleTime: 30_000 });
  const orders = useQuery({ queryKey: ['admin-payment-orders'], queryFn: () => listAdminPaymentOrders({ page_size: 30 }), staleTime: 30_000 });
  const action = useMutation({ mutationFn: ({ type, id, idempotencyKey }: { type: 'cancel' | 'retry' | 'refund'; id: number; idempotencyKey: string }) => type === 'cancel' ? cancelAdminPaymentOrder(id, idempotencyKey) : type === 'retry' ? retryAdminPaymentOrder(id, idempotencyKey) : refundAdminPaymentOrder(id, { reason: '管理员在移动端发起退款', force: false, deduct_balance: true }, idempotencyKey), onSuccess: (_result, input) => { delete actionKeys.current[`${input.type}:${input.id}`]; void client.invalidateQueries({ queryKey: ['admin-payment-dashboard'] }); void client.invalidateQueries({ queryKey: ['admin-payment-orders'] }); } });
  const data = dashboard.data ?? {};
  const items = orders.data?.items ?? [];
  function confirm(item: AdminPaymentOrder, type: 'cancel' | 'retry' | 'refund') {
    const labels = { cancel: '取消订单', retry: '重试履约', refund: '发起退款' };
    Alert.alert(labels[type], `订单 ${item.out_trade_no || item.id} 将由服务端执行“${labels[type]}”。`, [{ text: '取消', style: 'cancel' }, { text: '确认', style: type === 'refund' ? 'destructive' : 'default', onPress: () => { const key = `${type}:${item.id}`; if (!actionKeys.current[key]) actionKeys.current[key] = newIdempotencyKey(`admin-payment-${type}-${item.id}`); action.mutate({ type, id: item.id, idempotencyKey: actionKeys.current[key] }); } }]);
  }
  return <Page title="订单与资金" subtitle="服务端订单、履约和退款状态" refreshing={dashboard.isRefetching || orders.isRefetching} onRefresh={() => { void dashboard.refetch(); void orders.refetch(); }}>
    {dashboard.error || orders.error ? <Text style={{ color: theme.danger }}>{humanizeApiError(dashboard.error || orders.error)}</Text> : null}
    {action.error ? <Text style={{ color: theme.danger }}>{humanizeApiError(action.error)}</Text> : null}
    <View style={{ flexDirection: 'row', gap: 9 }}><Metric label="今日金额" value={formatOptionalMoney(data.today_amount ?? data.today_total)} tone="warning" /><Metric label="今日订单" value={formatOptionalNumber(data.today_orders ?? data.orders)} /><Metric label="成功率" value={data.success_rate == null ? '--' : `${data.success_rate}%`} /></View>
    <StateCard loading={orders.isLoading} error={orders.error} empty={!orders.isLoading && !orders.error && items.length === 0} onRetry={() => void orders.refetch()} emptyText="暂无订单" />
    <View style={{ gap: 10 }}>{items.map((item) => <Card key={item.id}><View style={{ flexDirection: 'row', gap: 11, alignItems: 'flex-start' }}><View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}><CircleDollarSign color={theme.primary} size={18} /></View><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '900' }}>#{item.out_trade_no || item.id}</Text><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>{item.user_email || '--'} · {item.payment_type || '--'}</Text><Text style={{ color: theme.faint, fontSize: 11, marginTop: 6 }}>{formatOptionalMoney(item.pay_amount ?? item.amount)} · {item.status || '--'} · {item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : '--'}</Text></View><Pressable onPress={() => void orders.refetch()} style={{ padding: 7 }}><RefreshCw color={theme.primary} size={16} /></Pressable></View><View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>{['pending', 'created', 'unpaid'].includes(String(item.status || '').toLowerCase()) ? <Pressable disabled={action.isPending} onPress={() => confirm(item, 'cancel')} style={{ flex: 1, borderRadius: 10, paddingVertical: 9, backgroundColor: theme.dangerSoft, alignItems: 'center' }}><Text style={{ color: theme.danger, fontSize: 12, fontWeight: '800' }}>取消</Text></Pressable> : null}<Pressable disabled={action.isPending} onPress={() => confirm(item, 'retry')} style={{ flex: 1, borderRadius: 10, paddingVertical: 9, backgroundColor: theme.primarySoft, alignItems: 'center' }}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>重试履约</Text></Pressable><Pressable disabled={action.isPending} onPress={() => confirm(item, 'refund')} style={{ flex: 1, borderRadius: 10, paddingVertical: 9, backgroundColor: theme.warningSoft, alignItems: 'center' }}><Text style={{ color: theme.warning, fontSize: 12, fontWeight: '800' }}>退款</Text></Pressable></View></Card>)}</View>
  </Page>;
}
