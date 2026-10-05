import { router } from 'expo-router';
import { CheckCircle2, ChevronLeft, CreditCard, RefreshCw, XCircle } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminConfigState } from '@/src/store/admin-config';
import { cancelPaymentOrder, createPaymentOrder, getCheckoutInfo, getRefundEligibleProviders, listPaymentOrders, requestPaymentRefund, resolvePaymentAction, resolvePaymentOAuthURL, verifyPaymentOrder, type CheckoutPlan, type PaymentCreateResponse, type PaymentOrder } from '@/src/services/user';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { newIdempotencyKey } from '@/src/lib/idempotency';
import { theme } from '@/src/theme';
import { useSnapshot } from 'valtio/react';

export default function UserBilling() {
  const config = useSnapshot(adminConfigState); const client = useQueryClient(); const [plan, setPlan] = useState<CheckoutPlan>(); const createKey = useRef(''); const cancelKeys = useRef<Record<number, string>>({}); const refundKeys = useRef<Record<number, string>>({}); const [refundTarget, setRefundTarget] = useState<PaymentOrder>(); const [refundReason, setRefundReason] = useState(''); const [paymentError, setPaymentError] = useState(''); const [statusMessage, setStatusMessage] = useState(''); const [paymentUnavailable, setPaymentUnavailable] = useState(false);
  const checkout = useQuery({ queryKey: ['payment-checkout-info'], queryFn: getCheckoutInfo, enabled: Boolean(config.accessToken) });
  const orders = useQuery({ queryKey: ['payment-orders'], queryFn: () => listPaymentOrders(), enabled: Boolean(config.accessToken) });
  const refundEligible = useQuery({ queryKey: ['payment-refund-eligible-providers'], queryFn: getRefundEligibleProviders, enabled: Boolean(config.accessToken), staleTime: 60_000 });
  const create = useMutation({ mutationFn: () => { if (!plan) throw new Error('请选择一个套餐'); const paymentType = methods[0]; if (!paymentType) throw new Error('当前没有可用的支付方式'); if (!createKey.current) createKey.current = newIdempotencyKey('payment-order-create'); setPaymentError(''); setStatusMessage(''); return createPaymentOrder({ amount: plan.price, plan_id: plan.id, order_type: 'subscription', payment_type: paymentType }, createKey.current); }, onSuccess: async (order: PaymentCreateResponse) => {
    await client.invalidateQueries({ queryKey: ['payment-orders'] });
    const resultType = String(order.result_type || 'order_created').trim().toLowerCase();
    if (resultType === 'oauth_required') {
      const oauth = resolvePaymentOAuthURL(order, String(config.baseUrl));
      if (!oauth) {
        setPaymentError('服务端要求微信授权，但没有返回有效的授权地址，无法继续付款。请刷新订单并联系管理员检查官方支付配置。');
        setPaymentUnavailable(true);
        return;
      }
      try {
        await Linking.openURL(oauth.url);
        setPaymentUnavailable(true);
        setStatusMessage('微信授权页面已打开。完成授权后返回 APP，刷新订单列表查看服务端状态；在确认结果前请勿重复创建订单。');
      } catch {
        setPaymentError('微信授权页面无法打开，请在微信或系统浏览器中完成授权；未确认付款，请勿重复创建订单。');
        setPaymentUnavailable(true);
      }
      return;
    }
    if (resultType === 'jsapi_ready') {
      // JSAPI requires the WeChat JS SDK and an in-WeChat browser. The native
      // client has no JSAPI bridge, so never claim that this order was paid.
      const payload = order.jsapi || order.jsapi_payload;
      setPaymentError(payload ? '服务端已准备微信 JSAPI 支付，但该流程只能在微信内置浏览器完成。请在微信内打开站点后重试；订单仍未支付。' : '服务端返回了不完整的微信 JSAPI 支付数据，无法安全继续付款。请联系管理员检查官方支付配置。');
      setPaymentUnavailable(true);
      return;
    }
    const action = resolvePaymentAction(order);
    const orderLabel = order.out_trade_no || String(order.order_id ?? order.id ?? '');
    if (!action) {
      // A created order without a provider URL cannot be completed by this
      // client. Surface a hard error instead of claiming that payment started
      // or asking the user to guess a provider action.
      if (order.client_secret || order.intent_id || /stripe/i.test(order.payment_type || '')) {
        setPaymentError(`订单 ${orderLabel || '已创建'} 已由官方 Stripe 接口创建 PaymentIntent，但 APP 当前没有 Stripe 原生支付组件，无法安全确认付款。请使用官方网页端完成支付或联系管理员；请勿重复创建订单。`);
      } else {
        setPaymentError(`订单 ${orderLabel || '已创建'} 未返回可打开的支付地址，无法继续付款。请先刷新订单状态并联系管理员检查支付通道；请勿重复创建订单。`);
      }
      setPaymentUnavailable(true);
      return;
    }
    setPaymentUnavailable(false);
    try {
      await Linking.openURL(action.url);
      // The provider URL has been handed off successfully. A later deliberate
      // checkout can now receive a fresh idempotency key; retries before this
      // point must replay the same server order.
      createKey.current = '';
      setStatusMessage(`订单 ${orderLabel || '已创建'} 的支付页面已打开，请在支付页面完成付款。当前状态：${order.status || '待支付'}。`);
    } catch {
      setPaymentError(`服务端返回的支付地址无法在本机打开（${action.source}）。请检查已安装的支付应用或浏览器后重试；订单仍为 ${order.status || '待支付'}，未确认付款。`);
    }
  } });
  const cancel = useMutation({ mutationFn: (input: { id: number; idempotencyKey: string }) => { setPaymentError(''); return cancelPaymentOrder(input.id, input.idempotencyKey); }, onSuccess: async (_result, input) => { delete cancelKeys.current[input.id]; await client.invalidateQueries({ queryKey: ['payment-orders'] }); setStatusMessage('订单已由服务端处理，订单列表已刷新。'); } });
  const verify = useMutation({ mutationFn: (order: PaymentOrder) => { setPaymentError(''); return verifyPaymentOrder(order.out_trade_no); }, onSuccess: async (order) => { await Promise.all([client.invalidateQueries({ queryKey: ['payment-orders'] }), client.invalidateQueries({ queryKey: ['user-profile'] }), client.invalidateQueries({ queryKey: ['user-subscriptions'] })]); setStatusMessage(`订单 ${order.out_trade_no || order.id || ''} 的服务端状态：${order.status || '未知'}。`); } });
  const refund = useMutation({ mutationFn: (input: { id: number; reason: string; idempotencyKey: string }) => { setPaymentError(''); return requestPaymentRefund(input.id, input.reason, input.idempotencyKey); }, onSuccess: async (_result, input) => { delete refundKeys.current[input.id]; setRefundTarget(undefined); setRefundReason(''); await client.invalidateQueries({ queryKey: ['payment-orders'] }); setStatusMessage('退款申请已提交，订单状态由服务端异步更新。'); } });
  const methods = Object.entries(checkout.data?.methods ?? {}).filter(([, value]) => value?.enabled !== false).map(([key]) => key);
  const actionError = cancel.error || verify.error || refund.error;
  const refundProviderIds = refundEligible.data?.provider_instance_ids ?? [];
  function canRequestRefund(order: PaymentOrder) { return order.status.toUpperCase() === 'COMPLETED' && Boolean(order.id) && Boolean(order.provider_instance_id) && refundProviderIds.includes(order.provider_instance_id!); }
  function openRefund(order: PaymentOrder) { if (order.id == null || !canRequestRefund(order) || refund.isPending) return; setPaymentError(''); setRefundReason(''); setRefundTarget(order); }
  function submitRefund() { const order = refundTarget; const reason = refundReason.trim(); if (order?.id == null || !canRequestRefund(order) || !reason || refund.isPending) return; if (!refundKeys.current[order.id]) refundKeys.current[order.id] = newIdempotencyKey(`payment-order-refund-${order.id}`); refund.mutate({ id: order.id, reason, idempotencyKey: refundKeys.current[order.id] }); }
  return <View style={{ flex: 1, backgroundColor: theme.page }}><ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Pressable onPress={() => router.back()} style={{ padding: 8 }}><ChevronLeft color={theme.text} size={22} /></Pressable><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 25, fontWeight: '900' }}>订阅与订单</Text><Text style={{ color: theme.subtext, marginTop: 3 }}>套餐和支付状态均来自服务端</Text></View><Pressable onPress={() => { setPaymentError(''); setStatusMessage(''); void checkout.refetch(); void orders.refetch(); void refundEligible.refetch(); }} style={{ padding: 8 }}><RefreshCw color={theme.primary} size={19} /></Pressable></View>{checkout.error || orders.error || refundEligible.error ? <Text style={{ color: theme.danger }}>{humanizeApiError(checkout.error || orders.error || refundEligible.error)}</Text> : null}{actionError ? <Text style={{ color: theme.danger }}>{humanizeApiError(actionError)}</Text> : null}{paymentError ? <Text style={{ color: theme.danger, lineHeight: 19 }}>{paymentError}</Text> : null}{statusMessage ? <Text style={{ color: theme.primary, lineHeight: 19 }}>{statusMessage}</Text> : null}<View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 18, padding: 16 }}><Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>可购买套餐</Text>{checkout.isLoading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} /> : checkout.data?.plans?.length ? <View style={{ gap: 9, marginTop: 12 }}>{checkout.data.plans.map((item) => <Pressable key={item.id} onPress={() => { if (plan?.id === item.id) return; createKey.current = ''; setPaymentError(''); setStatusMessage(''); setPaymentUnavailable(false); setPlan(item); }} style={{ borderRadius: 14, borderWidth: 1, borderColor: plan?.id === item.id ? theme.primary : theme.border, backgroundColor: plan?.id === item.id ? theme.primarySoft : theme.cardRaised, padding: 13 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '900' }}>{item.name}</Text><Text style={{ color: theme.subtext, fontSize: 11, marginTop: 4 }} numberOfLines={2}>{item.description || item.product_name || '服务订阅套餐'}</Text></View><Text style={{ color: theme.primary, fontWeight: '900' }}>{item.currency || 'USD'} {item.price.toFixed(2)}</Text></View>{plan?.id === item.id ? <CheckCircle2 color={theme.primary} size={17} style={{ position: 'absolute', right: 10, top: 10 }} /> : null}</Pressable>)}</View> : <Text style={{ color: theme.subtext, marginTop: 14 }}>当前没有可售套餐</Text>}{plan ? <><Text style={{ color: theme.faint, fontSize: 11, marginTop: 14 }}>支付方式：{methods.length ? methods.join('、') : '当前没有可用支付方式'}</Text><Pressable disabled={create.isPending || methods.length === 0 || paymentUnavailable} onPress={() => create.mutate()} style={{ marginTop: 12, borderRadius: 14, paddingVertical: 13, backgroundColor: create.isPending || methods.length === 0 || paymentUnavailable ? theme.muted : theme.primary, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 7 }}><CreditCard color="#fff" size={16} /><Text style={{ color: '#fff', fontWeight: '900' }}>{paymentUnavailable ? '支付信息不可用' : create.isPending ? '创建订单中…' : methods.length ? '创建支付订单' : '暂无可用支付方式'}</Text></Pressable></> : null}{create.error ? <Text style={{ color: theme.danger, marginTop: 10 }}>{humanizeApiError(create.error)}</Text> : null}</View>
    <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 18, padding: 16 }}><Text style={{ color: theme.text, fontWeight: '900', fontSize: 16 }}>我的订单</Text>{orders.isLoading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} /> : orders.data?.items?.length ? <View style={{ gap: 12, marginTop: 13 }}>{orders.data.items.map((order) => <OrderRow key={order.id ?? order.out_trade_no} order={order} refundEligible={canRequestRefund(order)} refundPending={refund.isPending} onRefund={() => openRefund(order)} onCancel={() => { if (order.id == null) return; Alert.alert('取消订单', '确认取消这个待支付订单？', [{ text: '返回', style: 'cancel' }, { text: '确认取消', style: 'destructive', onPress: () => { if (!cancelKeys.current[order.id!]) cancelKeys.current[order.id!] = newIdempotencyKey(`payment-order-cancel-${order.id}`); cancel.mutate({ id: order.id!, idempotencyKey: cancelKeys.current[order.id!] }); } }]); }} onVerify={() => { if (order.out_trade_no) verify.mutate(order); }} />)}</View> : <Text style={{ color: theme.subtext, marginTop: 14 }}>暂无订单</Text>}</View>
  </ScrollView><Modal transparent visible={Boolean(refundTarget)} animationType="slide" onRequestClose={() => { if (!refund.isPending) setRefundTarget(undefined); }}><View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000088' }}><View style={{ backgroundColor: theme.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ color: theme.text, fontSize: 20, fontWeight: '900', flex: 1 }}>申请退款</Text><Pressable disabled={refund.isPending} onPress={() => setRefundTarget(undefined)} style={{ padding: 4 }}><XCircle color={theme.subtext} size={21} /></Pressable></View><Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 9 }}>{`订单 ${refundTarget?.out_trade_no || refundTarget?.id || '--'} 将由服务端审核和处理。`}</Text><TextInput value={refundReason} onChangeText={setRefundReason} multiline maxLength={500} placeholder="请填写退款原因" placeholderTextColor={theme.faint} style={{ minHeight: 110, textAlignVertical: 'top', color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, padding: 14, marginTop: 15 }} />{refund.error ? <Text style={{ color: theme.danger, fontSize: 12, lineHeight: 18, marginTop: 10 }}>{humanizeApiError(refund.error)}</Text> : null}<Pressable disabled={!refundReason.trim() || refund.isPending} onPress={submitRefund} style={{ marginTop: 15, borderRadius: 14, backgroundColor: !refundReason.trim() || refund.isPending ? theme.muted : theme.primary, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '900' }}>{refund.isPending ? '提交中…' : '提交退款申请'}</Text></Pressable></View></View></Modal></View>;
}
function OrderRow({ order, refundEligible, refundPending, onRefund, onCancel, onVerify }: { order: PaymentOrder; refundEligible: boolean; refundPending: boolean; onRefund: () => void; onCancel: () => void; onVerify: () => void }) { const pending = ['pending', 'created', 'unpaid'].includes(order.status.toLowerCase()); const paid = ['paid', 'completed'].includes(order.status.toLowerCase()); return <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 11 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: paid ? theme.successSoft : pending ? theme.warningSoft : theme.cardRaised, alignItems: 'center', justifyContent: 'center' }}>{paid ? <CheckCircle2 color={theme.success} size={16} /> : pending ? <CreditCard color={theme.warning} size={16} /> : <XCircle color={theme.faint} size={16} />}</View><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>#{order.out_trade_no || order.order_id || order.id}</Text><Text style={{ color: theme.subtext, fontSize: 11, marginTop: 3 }}>{order.created_at ? new Date(order.created_at).toLocaleString('zh-CN') : '--'} · {order.payment_type || '--'}</Text></View><Text style={{ color: theme.text, fontWeight: '900' }}>${Number(order.pay_amount ?? order.amount ?? 0).toFixed(2)}</Text></View>{pending ? <View style={{ flexDirection: 'row', gap: 8, marginTop: 9 }}><Pressable onPress={onVerify} style={{ flex: 1, borderRadius: 10, backgroundColor: theme.primarySoft, alignItems: 'center', paddingVertical: 9 }}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>查询支付状态</Text></Pressable><Pressable onPress={onCancel} style={{ borderRadius: 10, backgroundColor: theme.dangerSoft, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9 }}><Text style={{ color: theme.danger, fontSize: 12, fontWeight: '800' }}>取消</Text></Pressable></View> : refundEligible ? <View style={{ marginTop: 9 }}><Pressable disabled={refundPending} onPress={onRefund} style={{ borderRadius: 10, backgroundColor: refundPending ? theme.muted : theme.warningSoft, alignItems: 'center', paddingVertical: 9 }}><Text style={{ color: refundPending ? theme.faint : theme.warning, fontSize: 12, fontWeight: '800' }}>{refundPending ? '申请提交中…' : '申请退款'}</Text></Pressable></View> : null}</View>; }
