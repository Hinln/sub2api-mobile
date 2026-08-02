import { useMutation, useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  BarChart3,
  BellRing,
  CalendarDays,
  ClipboardList,
  Copy,
  Megaphone,
  PackageCheck,
  Plus,
  ReceiptText,
  Search,
  TicketPercent,
  UsersRound,
  X,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Children, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Badge, Card, Metric, Page, SectionTitle, StateCard } from '@/src/components/ui';
import { useDebouncedValue } from '@/src/hooks/use-debounced-value';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { formatDisplayTime, formatTokenValue } from '@/src/lib/formatters';
import {
  createAnnouncement,
  createPromoCode,
  getDashboardModels,
  getPaymentDashboard,
  listAnnouncementReadStatus,
  listAnnouncements,
  listAuditLogs,
  listPaymentOrders,
  listPaymentPlans,
  listPromoCodes,
  listPromoCodeUsages,
} from '@/src/services/admin';
import { theme } from '@/src/theme';
import type {
  Announcement,
  AnnouncementNotifyMode,
  AnnouncementStatus,
  AuditLog,
  CurrencyAmounts,
  PromoCode,
} from '@/src/types/admin';

type CapabilityKey = 'finance' | 'orders' | 'plans' | 'coupons' | 'audit' | 'announcements' | 'models';
type BadgeTone = 'muted' | 'success' | 'danger' | 'warning' | 'primary';

const cardShadow = {
  shadowColor: '#25163D',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.045,
  shadowRadius: 14,
  elevation: 2,
};

function BackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="返回"
      onPress={() => router.back()}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 15,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.68 : 1,
      })}
    >
      <ArrowLeft color={theme.primary} size={20} />
    </Pressable>
  );
}

function ModulePage({ title, subtitle, refreshing, onRefresh, children }: {
  title: string;
  subtitle: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
}) {
  return (
    <Page title={title} subtitle={subtitle} refreshing={refreshing} onRefresh={onRefresh} right={<BackButton />}>
      {children}
    </Page>
  );
}

function MetricGrid({ children }: { children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {Children.map(children, (child) => <View style={{ flexBasis: '47%', flexGrow: 1 }}>{child}</View>)}
    </View>
  );
}

function SearchField({ value, onChangeText, placeholder, accessibilityLabel }: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14 }}>
      <Search color={theme.faint} size={18} />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.faint}
        autoCapitalize="none"
        style={{ flex: 1, color: theme.text, paddingVertical: 14 }}
      />
    </View>
  );
}

function FilterPills<T extends string>({ value, options, onChange }: {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
      {options.map(([key, label]) => (
        <Pressable
          key={key}
          accessibilityRole="button"
          onPress={() => onChange(key)}
          style={({ pressed }) => ({
            borderRadius: 999,
            paddingHorizontal: 15,
            paddingVertical: 9,
            backgroundColor: value === key ? theme.primary : theme.card,
            borderWidth: value === key ? 0 : 1,
            borderColor: theme.border,
            opacity: pressed ? 0.72 : 1,
          })}
        >
          <Text style={{ color: value === key ? '#FFFFFF' : theme.subtext, fontSize: 12, fontWeight: '900' }}>{label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18, marginTop: 18 }}>
      <Pressable disabled={page <= 1} onPress={() => onChange(page - 1)}>
        <Text style={{ color: page <= 1 ? theme.faint : theme.primary, fontWeight: '800' }}>上一页</Text>
      </Pressable>
      <Text style={{ color: theme.subtext }}>{page} / {pages}</Text>
      <Pressable disabled={page >= pages} onPress={() => onChange(page + 1)}>
        <Text style={{ color: page >= pages ? theme.faint : theme.primary, fontWeight: '800' }}>下一页</Text>
      </Pressable>
    </View>
  );
}

function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000099' }}>
        <View style={{ maxHeight: '90%', backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ flex: 1, color: theme.text, fontSize: 20, fontWeight: '900' }}>{title}</Text>
            <Pressable accessibilityLabel="关闭" onPress={onClose} style={{ padding: 8 }}><X color={theme.subtext} size={21} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 12 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function FormLabel({ children }: { children: ReactNode }) {
  return <Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '800', marginBottom: 7, marginTop: 14 }}>{children}</Text>;
}

function inputStyle(multiline = false) {
  return {
    color: theme.text,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.cardRaised,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: multiline ? 112 : 48,
    textAlignVertical: multiline ? 'top' as const : 'center' as const,
  };
}

function PrimaryButton({ label, onPress, disabled = false, icon }: { label: string; onPress: () => void; disabled?: boolean; icon?: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 50,
        borderRadius: 16,
        backgroundColor: disabled ? theme.muted : theme.primary,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        opacity: pressed ? 0.76 : 1,
      })}
    >
      {icon}
      <Text style={{ color: disabled ? theme.faint : '#FFFFFF', fontWeight: '900' }}>{label}</Text>
    </Pressable>
  );
}

function dateRange(days: number) {
  const end = new Date();
  const start = new Date(end.getTime() - Math.max(0, days - 1) * 24 * 60 * 60 * 1000);
  return { start_date: start.toISOString().slice(0, 10), end_date: end.toISOString().slice(0, 10) };
}

function integer(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('zh-CN').format(value) : '--';
}

function usd(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? `$${value.toFixed(4)}` : '--';
}

function currencyAmount(value?: number, currency?: string) {
  return typeof value === 'number' && Number.isFinite(value) ? `${currency || '未标记'} ${value.toFixed(2)}` : '--';
}

function currencyMap(values?: CurrencyAmounts) {
  const entries = Object.entries(values ?? {}).filter(([, value]) => Number.isFinite(value));
  return entries.length ? entries.map(([currency, value]) => `${currency || '未标记'} ${value.toFixed(2)}`).join(' / ') : '--';
}

function displayDate(value?: string | null) {
  return value ? formatDisplayTime(value) : '--';
}

function sumCurrencies<T>(items: T[], read: (item: T) => { currency?: string; amount?: number }) {
  return items.reduce<CurrencyAmounts>((acc, item) => {
    const value = read(item);
    if (typeof value.amount !== 'number' || !Number.isFinite(value.amount)) return acc;
    const key = value.currency || '未标记';
    acc[key] = (acc[key] ?? 0) + value.amount;
    return acc;
  }, {});
}

function FinanceModule() {
  const range = dateRange(30);
  const payments = useQuery({ queryKey: ['payment-dashboard', 30], queryFn: () => getPaymentDashboard(30) });
  const models = useQuery({ queryKey: ['finance-model-costs', range.start_date, range.end_date], queryFn: () => getDashboardModels(range) });
  const daily = payments.data?.daily_series ?? [];
  const methods = payments.data?.payment_methods ?? [];
  const topUsers = Object.entries(payments.data?.top_users ?? {}).flatMap(([currency, users]) => users.map((user) => ({ ...user, currency })));
  const modelRows = [...(models.data?.models ?? [])].sort((a, b) => (b.actual_cost ?? b.cost) - (a.actual_cost ?? a.cost));

  return (
    <ModulePage
      title="财务中心"
      subtitle="支付实收、订单趋势与用量计费的真实管理数据"
      refreshing={payments.isRefetching || models.isRefetching}
      onRefresh={() => { void payments.refetch(); void models.refetch(); }}
    >
      <StateCard loading={payments.isLoading} error={payments.error} onRetry={() => void payments.refetch()} />
      {payments.data ? (
        <>
          <MetricGrid>
            <Metric label="今日实收" value={currencyMap(payments.data.today_amount)} tone="success" />
            <Metric label="累计实收" value={currencyMap(payments.data.total_amount)} />
            <Metric label="今日订单" value={integer(payments.data.today_count)} />
            <Metric label="累计订单" value={integer(payments.data.total_count)} />
          </MetricGrid>

          <SectionTitle title="30 日收款趋势" />
          <StateCard empty={daily.length === 0} emptyText="近30日没有已记录的支付订单。" />
          <View style={{ gap: 10 }}>
            {daily.slice(-12).reverse().map((item) => (
              <Card key={item.date} style={cardShadow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: theme.successSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <CalendarDays color={theme.success} size={19} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: '900' }}>{item.date}</Text>
                    <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>{currencyMap(item.amount)}</Text>
                  </View>
                  <Badge label={`${item.count} 笔`} tone={item.count > 0 ? 'success' : 'muted'} />
                </View>
              </Card>
            ))}
          </View>

          <SectionTitle title="支付方式" />
          <StateCard empty={methods.length === 0} emptyText="Hub 尚未返回支付方式统计。" />
          <Card style={cardShadow}>
            <View style={{ gap: 14 }}>
              {methods.map((item) => (
                <View key={item.type} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: '800' }}>{item.type}</Text>
                    <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>{currencyMap(item.amount)}</Text>
                  </View>
                  <Badge label={`${item.count} 笔`} tone="primary" />
                </View>
              ))}
            </View>
          </Card>

          <SectionTitle title="付费用户排行" />
          <StateCard empty={topUsers.length === 0} emptyText="当前没有可展示的付费用户排行。" />
          <View style={{ gap: 10 }}>
            {topUsers.slice(0, 10).map((user, index) => (
              <Card key={`${user.currency}-${user.user_id}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: theme.primary, fontWeight: '900' }}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '900' }}>{user.email || `用户 #${user.user_id}`}</Text>
                    <Text style={{ color: theme.faint, fontSize: 11, marginTop: 4 }}>{`用户 #${user.user_id}`}</Text>
                  </View>
                  <Text style={{ color: theme.success, fontWeight: '900' }}>{currencyAmount(user.amount, user.currency)}</Text>
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      <SectionTitle title="30 日用量计费排行" />
      <StateCard loading={models.isLoading} error={models.error} empty={!models.isLoading && !models.error && modelRows.length === 0} emptyText="近30日没有模型用量计费记录。" onRetry={() => void models.refetch()} />
      <View style={{ gap: 10 }}>
        {modelRows.slice(0, 10).map((model) => (
          <Card key={model.model}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <BarChart3 color={theme.primary} size={20} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '900' }}>{model.model}</Text>
                <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>{`请求 ${integer(model.requests)} · Token ${formatTokenValue(model.total_tokens)}`}</Text>
                <Text style={{ color: theme.faint, fontSize: 11, marginTop: 5 }}>{`标准计费 ${usd(model.cost)} · 实际扣费 ${usd(model.actual_cost)}`}</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <Card style={{ marginTop: 18, backgroundColor: theme.warningSoft }}>
        <Text style={{ color: theme.text, fontWeight: '900' }}>利润口径</Text>
        <Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 19, marginTop: 7 }}>支付看板提供实收金额，用量看板提供标准计费和实际扣费。Hub 尚未返回已结算的上游成本，且收款可包含多币种，因此这里不会伪造“利润”数字。</Text>
      </Card>
    </ModulePage>
  );
}

function orderStatus(status: string): { label: string; tone: BadgeTone } {
  const map: Record<string, { label: string; tone: BadgeTone }> = {
    PENDING: { label: '待支付', tone: 'warning' },
    PAID: { label: '已支付', tone: 'primary' },
    RECHARGING: { label: '入账中', tone: 'warning' },
    COMPLETED: { label: '已完成', tone: 'success' },
    EXPIRED: { label: '已过期', tone: 'muted' },
    CANCELLED: { label: '已取消', tone: 'muted' },
    FAILED: { label: '失败', tone: 'danger' },
    REFUND_REQUESTED: { label: '申请退款', tone: 'warning' },
    REFUNDING: { label: '退款中', tone: 'warning' },
    REFUND_PENDING: { label: '退款待确认', tone: 'warning' },
    PARTIALLY_REFUNDED: { label: '部分退款', tone: 'primary' },
    REFUNDED: { label: '已退款', tone: 'success' },
    REFUND_FAILED: { label: '退款失败', tone: 'danger' },
  };
  return map[status] ?? { label: status || '未标记', tone: 'muted' };
}

function OrdersModule() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const keyword = useDebouncedValue(search.trim(), 300);
  const query = useQuery({
    queryKey: ['payment-orders', keyword, status, page],
    queryFn: () => listPaymentOrders({ page, page_size: 30, keyword: keyword || undefined, status: status || undefined }),
  });
  const items = query.data?.items ?? [];
  const completed = items.filter((item) => item.status === 'COMPLETED').length;
  const pending = items.filter((item) => ['PENDING', 'PAID', 'RECHARGING'].includes(item.status)).length;
  const paid = currencyMap(sumCurrencies(items, (item) => ({ currency: item.currency, amount: item.pay_amount })));

  return (
    <ModulePage title="订单管理" subtitle="真实充值、订阅订单和支付流水" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <MetricGrid>
        <Metric label="全部订单" value={integer(query.data?.total)} />
        <Metric label="本页已完成" value={integer(completed)} tone="success" />
        <Metric label="本页处理中" value={integer(pending)} tone="warning" />
        <Metric label="本页应付合计" value={paid} />
      </MetricGrid>

      <View style={{ marginTop: 14 }}>
        <SearchField value={search} onChangeText={(value) => { setSearch(value); setPage(1); }} placeholder="搜索订单号、邮箱或用户" accessibilityLabel="search-payment-orders" />
      </View>
      <FilterPills
        value={status}
        onChange={(value) => { setStatus(value); setPage(1); }}
        options={[["", '全部'], ['PENDING', '待支付'], ['COMPLETED', '已完成'], ['FAILED', '失败'], ['REFUNDED', '已退款']] as const}
      />

      <StateCard loading={query.isLoading} error={query.error} empty={!query.isLoading && !query.error && items.length === 0} emptyText="当前筛选条件下没有订单。" onRetry={() => void query.refetch()} />
      <View style={{ gap: 10 }}>
        {items.map((order) => {
          const current = orderStatus(order.status);
          return (
            <Card key={order.id} style={cardShadow}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: current.tone === 'danger' ? theme.dangerSoft : current.tone === 'success' ? theme.successSoft : theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <ReceiptText color={current.tone === 'danger' ? theme.danger : current.tone === 'success' ? theme.success : theme.primary} size={20} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontSize: 15, fontWeight: '900' }}>{order.out_trade_no || `订单 #${order.id}`}</Text>
                    <Badge label={current.label} tone={current.tone} />
                  </View>
                  <Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>{order.user_email || order.user_name || `用户 #${order.user_id}`}</Text>
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800', marginTop: 7 }}>{currencyAmount(order.pay_amount, order.currency)}</Text>
                  <Text style={{ color: theme.faint, fontSize: 11, marginTop: 6 }}>{`${order.order_type === 'subscription' ? '订阅' : '余额充值'} · ${order.payment_type || '支付方式未返回'} · ${displayDate(order.created_at)}`}</Text>
                  {order.failed_reason ? <Text style={{ color: theme.danger, fontSize: 11, lineHeight: 17, marginTop: 7 }}>{order.failed_reason}</Text> : null}
                  {order.refund_amount > 0 ? <Text style={{ color: theme.warning, fontSize: 11, marginTop: 7 }}>{`已退 ${currencyAmount(order.refund_amount, order.currency)}`}</Text> : null}
                </View>
              </View>
            </Card>
          );
        })}
      </View>
      <Pager page={page} pages={query.data?.pages ?? 1} onChange={setPage} />
    </ModulePage>
  );
}

function PlansModule() {
  const query = useQuery({ queryKey: ['payment-plans'], queryFn: listPaymentPlans });
  const items = query.data ?? [];
  const onSale = items.filter((item) => item.for_sale).length;
  const groupCount = new Set(items.map((item) => item.group_id)).size;

  return (
    <ModulePage title="套餐管理" subtitle="订阅套餐的分组、倍率、价格与配额" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <MetricGrid>
        <Metric label="套餐数量" value={integer(items.length)} />
        <Metric label="在售套餐" value={integer(onSale)} tone="success" />
        <Metric label="关联分组" value={integer(groupCount)} />
      </MetricGrid>

      <SectionTitle title="套餐列表" />
      <StateCard loading={query.isLoading} error={query.error} empty={!query.isLoading && !query.error && items.length === 0} emptyText="Hub 当前没有配置订阅套餐。" onRetry={() => void query.refetch()} />
      <View style={{ gap: 10 }}>
        {items.map((plan) => {
          const features = typeof plan.features === 'string' ? plan.features.split('\n').map((item) => item.trim()).filter(Boolean) : [];
          return (
            <Card key={plan.id} style={cardShadow}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: plan.for_sale ? theme.successSoft : theme.muted, alignItems: 'center', justifyContent: 'center' }}>
                  <PackageCheck color={plan.for_sale ? theme.success : theme.faint} size={20} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontSize: 15, fontWeight: '900' }}>{plan.name}</Text>
                    <Badge label={plan.for_sale ? '在售' : '已下架'} tone={plan.for_sale ? 'success' : 'muted'} />
                  </View>
                  <Text style={{ color: theme.primary, fontSize: 18, fontWeight: '900', marginTop: 7 }}>{currencyAmount(plan.price, plan.currency || '未标记')}</Text>
                  <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 6 }}>{`${plan.group_name || `分组 #${plan.group_id}`} · ${plan.group_platform || '平台未返回'} · 倍率 ${typeof plan.rate_multiplier === 'number' ? `${plan.rate_multiplier.toFixed(2)}x` : '--'}`}</Text>
                  <Text style={{ color: theme.faint, fontSize: 11, marginTop: 6 }}>{`有效期 ${plan.validity_days} ${plan.validity_unit || '天'} · 日 ${usd(plan.daily_limit_usd ?? undefined)} · 周 ${usd(plan.weekly_limit_usd ?? undefined)} · 月 ${usd(plan.monthly_limit_usd ?? undefined)}`}</Text>
                  {plan.supported_model_scopes?.length ? <Text numberOfLines={2} style={{ color: theme.faint, fontSize: 11, lineHeight: 17, marginTop: 6 }}>{`模型范围 ${plan.supported_model_scopes.join('、')}`}</Text> : null}
                  {features.length ? <Text numberOfLines={3} style={{ color: theme.subtext, fontSize: 11, lineHeight: 17, marginTop: 8 }}>{features.slice(0, 3).join(' · ')}</Text> : null}
                  {plan.description ? <Text numberOfLines={3} style={{ color: theme.subtext, fontSize: 11, lineHeight: 17, marginTop: 8 }}>{plan.description}</Text> : null}
                </View>
              </View>
            </Card>
          );
        })}
      </View>
    </ModulePage>
  );
}

function promoState(item: PromoCode): { label: string; tone: BadgeTone } {
  if (item.expires_at && new Date(item.expires_at).getTime() < Date.now()) return { label: '已过期', tone: 'danger' };
  if (item.max_uses > 0 && item.used_count >= item.max_uses) return { label: '已用完', tone: 'muted' };
  return item.status === 'active' ? { label: '可用', tone: 'success' } : { label: '已停用', tone: 'muted' };
}

function PromoModule() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<PromoCode>();
  const [code, setCode] = useState('');
  const [bonus, setBonus] = useState('1');
  const [maxUses, setMaxUses] = useState('0');
  const [notes, setNotes] = useState('');
  const keyword = useDebouncedValue(search.trim(), 300);
  const query = useQuery({
    queryKey: ['promo-codes', keyword, status, page],
    queryFn: () => listPromoCodes(keyword, { page, page_size: 30, status: status || undefined }),
  });
  const usages = useQuery({
    queryKey: ['promo-code-usages', selected?.id],
    queryFn: () => listPromoCodeUsages(selected!.id),
    enabled: Boolean(selected),
  });
  const create = useMutation({ mutationFn: createPromoCode });
  const items = query.data?.items ?? [];
  const active = items.filter((item) => promoState(item).tone === 'success').length;
  const used = items.reduce((total, item) => total + item.used_count, 0);

  async function submit() {
    const parsedBonus = Number(bonus.trim());
    const parsedMaxUses = Number(maxUses.trim() || '0');
    if (!Number.isFinite(parsedBonus) || parsedBonus <= 0) {
      Alert.alert('无法创建', '赠送余额必须是大于 0 的数字。');
      return;
    }
    if (!Number.isInteger(parsedMaxUses) || parsedMaxUses < 0) {
      Alert.alert('无法创建', '最大使用次数必须是非负整数，0 表示不限次数。');
      return;
    }
    try {
      const created = await create.mutateAsync({
        code: code.trim() || undefined,
        bonus_amount: parsedBonus,
        max_uses: parsedMaxUses,
        notes: notes.trim() || undefined,
      });
      setShowCreate(false);
      setCode('');
      setBonus('1');
      setMaxUses('0');
      setNotes('');
      await query.refetch();
      Alert.alert('创建成功', `优惠码 ${created.code} 已由 Hub 创建。`);
    } catch (error) {
      Alert.alert('创建失败', humanizeApiError(error));
    }
  }

  return (
    <>
      <ModulePage title="优惠码" subtitle="真实推广码、赠送余额和使用记录" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
        <MetricGrid>
          <Metric label="优惠码总数" value={integer(query.data?.total)} />
          <Metric label="本页可用" value={integer(active)} tone="success" />
          <Metric label="本页累计使用" value={integer(used)} />
        </MetricGrid>

        <View style={{ marginTop: 14 }}>
          <PrimaryButton label="创建优惠码" onPress={() => setShowCreate(true)} icon={<Plus color="#FFFFFF" size={18} />} />
        </View>
        <View style={{ marginTop: 12 }}>
          <SearchField value={search} onChangeText={(value) => { setSearch(value); setPage(1); }} placeholder="搜索优惠码或备注" accessibilityLabel="search-promo-codes" />
        </View>
        <FilterPills value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[["", '全部'], ['active', '启用'], ['disabled', '停用']] as const} />

        <StateCard loading={query.isLoading} error={query.error} empty={!query.isLoading && !query.error && items.length === 0} emptyText="当前筛选条件下没有优惠码。" onRetry={() => void query.refetch()} />
        <View style={{ gap: 10 }}>
          {items.map((item) => {
            const state = promoState(item);
            return (
              <Pressable key={item.id} accessibilityRole="button" onPress={() => setSelected(item)}>
                <Card style={cardShadow}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: state.tone === 'success' ? theme.successSoft : state.tone === 'danger' ? theme.dangerSoft : theme.muted, alignItems: 'center', justifyContent: 'center' }}>
                      <TicketPercent color={state.tone === 'success' ? theme.success : state.tone === 'danger' ? theme.danger : theme.faint} size={20} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text selectable numberOfLines={1} style={{ flex: 1, color: theme.text, fontSize: 15, fontWeight: '900' }}>{item.code}</Text>
                        <Badge label={state.label} tone={state.tone} />
                      </View>
                      <Text style={{ color: theme.success, fontSize: 14, fontWeight: '900', marginTop: 6 }}>{`赠送 $${item.bonus_amount.toFixed(2)}`}</Text>
                      <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 6 }}>{`已使用 ${item.used_count} / ${item.max_uses === 0 ? '不限' : item.max_uses}`}</Text>
                      <Text style={{ color: theme.faint, fontSize: 11, marginTop: 6 }}>{`到期 ${displayDate(item.expires_at)} · 创建 ${displayDate(item.created_at)}`}</Text>
                      {item.notes ? <Text numberOfLines={2} style={{ color: theme.subtext, fontSize: 11, lineHeight: 17, marginTop: 7 }}>{item.notes}</Text> : null}
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
        <Pager page={page} pages={query.data?.pages ?? 1} onChange={setPage} />
      </ModulePage>

      <Sheet visible={showCreate} title="创建优惠码" onClose={() => { if (!create.isPending) setShowCreate(false); }}>
        <Card style={{ backgroundColor: theme.primarySoft }}>
          <Text style={{ color: theme.text, fontWeight: '900' }}>由 Hub 生成真实记录</Text>
          <Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 5 }}>优惠码可留空由服务端生成；最大使用次数为 0 时表示不限次数。</Text>
        </Card>
        <FormLabel>优惠码（可选）</FormLabel>
        <TextInput value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} placeholder="留空则自动生成" placeholderTextColor={theme.faint} style={inputStyle()} />
        <FormLabel>赠送余额</FormLabel>
        <TextInput value={bonus} onChangeText={setBonus} keyboardType="decimal-pad" placeholder="1" placeholderTextColor={theme.faint} style={inputStyle()} />
        <FormLabel>最大使用次数</FormLabel>
        <TextInput value={maxUses} onChangeText={setMaxUses} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.faint} style={inputStyle()} />
        <FormLabel>备注</FormLabel>
        <TextInput value={notes} onChangeText={setNotes} multiline placeholder="可选的运营备注" placeholderTextColor={theme.faint} style={inputStyle(true)} />
        <View style={{ marginTop: 18 }}>
          <PrimaryButton label={create.isPending ? '正在创建…' : '确认创建'} disabled={create.isPending} onPress={() => void submit()} />
        </View>
      </Sheet>

      <Sheet visible={Boolean(selected)} title={selected ? `使用记录 · ${selected.code}` : '使用记录'} onClose={() => setSelected(undefined)}>
        {selected ? (
          <Pressable onPress={() => void Clipboard.setStringAsync(selected.code)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: theme.primarySoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 14 }}>
            <Copy color={theme.primary} size={15} />
            <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>复制优惠码</Text>
          </Pressable>
        ) : null}
        <StateCard loading={usages.isLoading} error={usages.error} empty={!usages.isLoading && !usages.error && (usages.data?.items.length ?? 0) === 0} emptyText="该优惠码尚未被使用。" onRetry={() => void usages.refetch()} />
        <View style={{ gap: 10 }}>
          {(usages.data?.items ?? []).map((usage) => (
            <Card key={usage.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <UsersRound color={theme.primary} size={18} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '900' }}>{usage.user?.email || usage.user?.username || `用户 #${usage.user_id}`}</Text>
                  <Text style={{ color: theme.faint, fontSize: 11, marginTop: 4 }}>{displayDate(usage.used_at)}</Text>
                </View>
                <Text style={{ color: theme.success, fontWeight: '900' }}>+${usage.bonus_amount.toFixed(2)}</Text>
              </View>
            </Card>
          ))}
        </View>
      </Sheet>
    </>
  );
}

function AuditModule() {
  const [search, setSearch] = useState('');
  const [result, setResult] = useState('');
  const [page, setPage] = useState(1);
  const keyword = useDebouncedValue(search.trim(), 300);
  const query = useQuery({
    queryKey: ['audit-logs', keyword, result, page],
    queryFn: () => listAuditLogs({ page, page_size: 30, q: keyword || undefined, success: result ? result === 'success' : undefined }),
  });
  const items = query.data?.items ?? [];
  const successCount = items.filter((item) => item.status_code < 400).length;
  const failedCount = items.filter((item) => item.status_code >= 400).length;
  const actors = new Set(items.map((item) => item.actor_email).filter(Boolean)).size;

  return (
    <ModulePage title="操作日志" subtitle="管理员、时间、操作内容、IP 和执行结果" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <MetricGrid>
        <Metric label="审计记录" value={integer(query.data?.total)} />
        <Metric label="本页成功" value={integer(successCount)} tone="success" />
        <Metric label="本页失败" value={integer(failedCount)} tone={failedCount > 0 ? 'danger' : 'default'} />
        <Metric label="本页管理员" value={integer(actors)} />
      </MetricGrid>

      <View style={{ marginTop: 14 }}>
        <SearchField value={search} onChangeText={(value) => { setSearch(value); setPage(1); }} placeholder="搜索操作、路径、管理员或 IP" accessibilityLabel="search-audit-logs" />
      </View>
      <FilterPills value={result} onChange={(value) => { setResult(value); setPage(1); }} options={[["", '全部'], ['success', '成功'], ['failed', '失败']] as const} />

      <StateCard loading={query.isLoading} error={query.error} empty={!query.isLoading && !query.error && items.length === 0} emptyText="当前筛选条件下没有操作日志。" onRetry={() => void query.refetch()} />
      <View style={{ gap: 10 }}>
        {items.map((item: AuditLog) => {
          const success = item.status_code < 400;
          return (
            <Card key={item.id} style={cardShadow}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: success ? theme.successSoft : theme.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardList color={success ? theme.success : theme.danger} size={20} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontSize: 14, fontWeight: '900' }}>{item.action || `${item.method} ${item.path}`}</Text>
                    <Badge label={`HTTP ${item.status_code}`} tone={success ? 'success' : 'danger'} />
                  </View>
                  <Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>{item.actor_email || `管理员 #${item.actor_user_id ?? '--'}`} · {item.auth_method || '认证方式未返回'}</Text>
                  <Text numberOfLines={2} style={{ color: theme.text, fontSize: 12, lineHeight: 18, marginTop: 7 }}>{`${item.method} ${item.path}`}</Text>
                  <Text style={{ color: theme.faint, fontSize: 11, marginTop: 6 }}>{`${item.client_ip || 'IP 未返回'} · ${item.latency_ms}ms · ${displayDate(item.created_at)}`}</Text>
                  {item.request_id ? <Text selectable numberOfLines={1} style={{ color: theme.faint, fontSize: 10, marginTop: 6 }}>Request ID {item.request_id}</Text> : null}
                </View>
              </View>
            </Card>
          );
        })}
      </View>
      <Pager page={page} pages={query.data?.pages ?? 1} onChange={setPage} />
    </ModulePage>
  );
}

function announcementState(status: AnnouncementStatus): { label: string; tone: BadgeTone } {
  if (status === 'active') return { label: '已发布', tone: 'success' };
  if (status === 'draft') return { label: '草稿', tone: 'warning' };
  return { label: '已归档', tone: 'muted' };
}

function AnnouncementsModule() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Announcement>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [createStatus, setCreateStatus] = useState<AnnouncementStatus>('draft');
  const [notifyMode, setNotifyMode] = useState<AnnouncementNotifyMode>('silent');
  const keyword = useDebouncedValue(search.trim(), 300);
  const query = useQuery({
    queryKey: ['announcements', keyword, status, page],
    queryFn: () => listAnnouncements(keyword, { page, page_size: 30, status: status || undefined }),
  });
  const reads = useQuery({
    queryKey: ['announcement-read-status', selected?.id],
    queryFn: () => listAnnouncementReadStatus(selected!.id),
    enabled: Boolean(selected),
  });
  const create = useMutation({ mutationFn: createAnnouncement });
  const items = query.data?.items ?? [];
  const active = items.filter((item) => item.status === 'active').length;
  const drafts = items.filter((item) => item.status === 'draft').length;

  async function submit() {
    if (!title.trim() || !content.trim()) {
      Alert.alert('无法创建', '请填写公告标题和正文。');
      return;
    }
    try {
      await create.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        status: createStatus,
        notify_mode: notifyMode,
        targeting: { any_of: [] },
      });
      setShowCreate(false);
      setTitle('');
      setContent('');
      setCreateStatus('draft');
      setNotifyMode('silent');
      await query.refetch();
      Alert.alert('创建成功', createStatus === 'active' ? '公告已发布。' : '公告草稿已保存。');
    } catch (error) {
      Alert.alert('创建失败', humanizeApiError(error));
    }
  }

  const eligibleReads = (reads.data?.items ?? []).filter((item) => item.eligible);
  const readCount = eligibleReads.filter((item) => item.read_at).length;

  return (
    <>
      <ModulePage title="公告" subtitle="公告发布、状态和用户阅读情况" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
        <MetricGrid>
          <Metric label="公告总数" value={integer(query.data?.total)} />
          <Metric label="本页已发布" value={integer(active)} tone="success" />
          <Metric label="本页草稿" value={integer(drafts)} tone="warning" />
        </MetricGrid>

        <View style={{ marginTop: 14 }}>
          <PrimaryButton label="新建公告" onPress={() => setShowCreate(true)} icon={<Plus color="#FFFFFF" size={18} />} />
        </View>
        <View style={{ marginTop: 12 }}>
          <SearchField value={search} onChangeText={(value) => { setSearch(value); setPage(1); }} placeholder="搜索公告标题或内容" accessibilityLabel="search-announcements" />
        </View>
        <FilterPills value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[["", '全部'], ['active', '已发布'], ['draft', '草稿'], ['archived', '已归档']] as const} />

        <StateCard loading={query.isLoading} error={query.error} empty={!query.isLoading && !query.error && items.length === 0} emptyText="当前筛选条件下没有公告。" onRetry={() => void query.refetch()} />
        <View style={{ gap: 10 }}>
          {items.map((item) => {
            const state = announcementState(item.status);
            return (
              <Pressable key={item.id} accessibilityRole="button" onPress={() => setSelected(item)}>
                <Card style={cardShadow}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: item.status === 'active' ? theme.successSoft : theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                      <Megaphone color={item.status === 'active' ? theme.success : theme.primary} size={20} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontSize: 15, fontWeight: '900' }}>{item.title}</Text>
                        <Badge label={state.label} tone={state.tone} />
                      </View>
                      <Text numberOfLines={3} style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 7 }}>{item.content}</Text>
                      <Text style={{ color: theme.faint, fontSize: 11, marginTop: 7 }}>{`${item.notify_mode === 'popup' ? '弹窗提醒' : '静默通知'} · ${displayDate(item.created_at)}`}</Text>
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
        <Pager page={page} pages={query.data?.pages ?? 1} onChange={setPage} />
      </ModulePage>

      <Sheet visible={showCreate} title="新建公告" onClose={() => { if (!create.isPending) setShowCreate(false); }}>
        <Card style={{ backgroundColor: theme.primarySoft }}>
          <Text style={{ color: theme.text, fontWeight: '900' }}>发布范围：全部用户</Text>
          <Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 5 }}>移动端使用后端的空 targeting 契约，代表不限定用户。默认保存为草稿，可显式切换为发布。</Text>
        </Card>
        <FormLabel>标题</FormLabel>
        <TextInput value={title} onChangeText={setTitle} placeholder="公告标题" placeholderTextColor={theme.faint} style={inputStyle()} />
        <FormLabel>正文</FormLabel>
        <TextInput value={content} onChangeText={setContent} multiline placeholder="公告内容" placeholderTextColor={theme.faint} style={inputStyle(true)} />
        <FormLabel>状态</FormLabel>
        <FilterPills value={createStatus} onChange={setCreateStatus} options={[["draft", '保存草稿'], ['active', '立即发布']] as const} />
        <FormLabel>提醒方式</FormLabel>
        <FilterPills value={notifyMode} onChange={setNotifyMode} options={[["silent", '静默通知'], ['popup', '弹窗提醒']] as const} />
        <View style={{ marginTop: 10 }}>
          <PrimaryButton label={create.isPending ? '正在提交…' : createStatus === 'active' ? '确认发布' : '保存草稿'} disabled={create.isPending} onPress={() => void submit()} />
        </View>
      </Sheet>

      <Sheet visible={Boolean(selected)} title={selected?.title || '公告详情'} onClose={() => setSelected(undefined)}>
        {selected ? (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <Badge label={announcementState(selected.status).label} tone={announcementState(selected.status).tone} />
              <Badge label={selected.notify_mode === 'popup' ? '弹窗提醒' : '静默通知'} tone="primary" />
            </View>
            <Text selectable style={{ color: theme.text, fontSize: 14, lineHeight: 23 }}>{selected.content}</Text>
            <Text style={{ color: theme.faint, fontSize: 11, marginTop: 12 }}>{`创建 ${displayDate(selected.created_at)} · 更新 ${displayDate(selected.updated_at)}`}</Text>
            <SectionTitle title="阅读情况" />
            <MetricGrid>
              <Metric label="符合条件" value={integer(reads.data?.total)} />
              <Metric label="已读（当前页）" value={integer(readCount)} tone="success" />
            </MetricGrid>
            <View style={{ marginTop: 12 }}>
              <StateCard loading={reads.isLoading} error={reads.error} empty={!reads.isLoading && !reads.error && (reads.data?.items.length ?? 0) === 0} emptyText="尚无用户阅读状态。" onRetry={() => void reads.refetch()} />
            </View>
            <View style={{ gap: 10 }}>
              {eligibleReads.map((item) => (
                <Card key={item.user_id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <BellRing color={item.read_at ? theme.success : theme.faint} size={18} />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '900' }}>{item.email || item.username || `用户 #${item.user_id}`}</Text>
                      <Text style={{ color: theme.faint, fontSize: 11, marginTop: 4 }}>{item.read_at ? displayDate(item.read_at) : '尚未阅读'}</Text>
                    </View>
                    <Badge label={item.read_at ? '已读' : '未读'} tone={item.read_at ? 'success' : 'muted'} />
                  </View>
                </Card>
              ))}
            </View>
          </>
        ) : null}
      </Sheet>
    </>
  );
}

function ModelsModule() {
  const range = dateRange(30);
  const query = useQuery({ queryKey: ['model-analytics', range.start_date, range.end_date], queryFn: () => getDashboardModels(range) });
  const items = [...(query.data?.models ?? [])].sort((a, b) => b.total_tokens - a.total_tokens);
  const totalRequests = items.reduce((total, item) => total + item.requests, 0);
  const totalTokens = items.reduce((total, item) => total + item.total_tokens, 0);
  const totalActualCost = items.reduce((total, item) => total + item.actual_cost, 0);

  return (
    <ModulePage title="模型分析" subtitle="近30日真实模型请求、Token 和计费排行" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <MetricGrid>
        <Metric label="活跃模型" value={integer(items.length)} />
        <Metric label="请求总数" value={integer(totalRequests)} />
        <Metric label="Token 总量" value={formatTokenValue(totalTokens)} />
        <Metric label="实际扣费" value={usd(totalActualCost)} />
      </MetricGrid>

      <SectionTitle title="Token 消耗排行" />
      <StateCard loading={query.isLoading} error={query.error} empty={!query.isLoading && !query.error && items.length === 0} emptyText="近30日没有模型调用数据。" onRetry={() => void query.refetch()} />
      <View style={{ gap: 10 }}>
        {items.map((item, index) => {
          const share = totalTokens > 0 ? item.total_tokens / totalTokens : 0;
          return (
            <Card key={item.model} style={cardShadow}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: theme.primary, fontWeight: '900' }}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontSize: 15, fontWeight: '900' }}>{item.model}</Text>
                    <Badge label={`${(share * 100).toFixed(1)}%`} tone="primary" />
                  </View>
                  <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 6 }}>{`请求 ${integer(item.requests)} · Token ${formatTokenValue(item.total_tokens)}`}</Text>
                  <Text style={{ color: theme.faint, fontSize: 11, marginTop: 6 }}>{`输入 ${formatTokenValue(item.input_tokens)} · 输出 ${formatTokenValue(item.output_tokens)} · 缓存读取 ${formatTokenValue(item.cache_read_tokens)}`}</Text>
                  <Text style={{ color: theme.faint, fontSize: 11, marginTop: 6 }}>{`标准计费 ${usd(item.cost)} · 实际扣费 ${usd(item.actual_cost)}`}</Text>
                  <View style={{ height: 7, borderRadius: 999, backgroundColor: theme.cardRaised, overflow: 'hidden', marginTop: 10 }}>
                    <View style={{ width: `${Math.max(2, share * 100)}%`, height: '100%', borderRadius: 999, backgroundColor: theme.primary }} />
                  </View>
                </View>
              </View>
            </Card>
          );
        })}
      </View>
      <Card style={{ marginTop: 18, backgroundColor: theme.primarySoft }}>
        <Text style={{ color: theme.text, fontWeight: '900' }}>数据口径</Text>
        <Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 19, marginTop: 7 }}>此页使用 Dashboard 的 requested-model 统计口径。当前已验证契约是模型分析读取；模型启停和渠道绑定属于独立的渠道配置能力。</Text>
      </Card>
    </ModulePage>
  );
}

export default function CapabilitiesScreen() {
  const params = useLocalSearchParams<{ module?: string | string[] }>();
  const rawModule = Array.isArray(params.module) ? params.module[0] : params.module;
  const key = (['finance', 'orders', 'plans', 'coupons', 'audit', 'announcements', 'models'] as CapabilityKey[]).includes(rawModule as CapabilityKey)
    ? rawModule as CapabilityKey
    : 'finance';

  if (key === 'orders') return <OrdersModule />;
  if (key === 'plans') return <PlansModule />;
  if (key === 'coupons') return <PromoModule />;
  if (key === 'audit') return <AuditModule />;
  if (key === 'announcements') return <AnnouncementsModule />;
  if (key === 'models') return <ModelsModule />;
  return <FinanceModule />;
}
