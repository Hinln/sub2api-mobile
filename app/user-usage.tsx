import { router } from 'expo-router';
import { ChevronLeft, Clock3, Activity } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { adminConfigState } from '@/src/store/admin-config';
import { getUsageStats, listUsageLogs, type UsageLog } from '@/src/services/user';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { formatOptionalMoney, formatOptionalNumber } from '@/src/lib/formatters';
import { theme } from '@/src/theme';
import { useSnapshot } from 'valtio/react';

export default function UserUsage() {
  const config = useSnapshot(adminConfigState); const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month');
  const stats = useQuery({ queryKey: ['user-usage-stats', period], queryFn: () => getUsageStats({ period }), enabled: Boolean(config.accessToken) });
  const logs = useQuery({ queryKey: ['user-usage-logs', period], queryFn: () => listUsageLogs({ period, page_size: 30 }), enabled: Boolean(config.accessToken) });
  const data = stats.data ?? {}; const items = logs.data?.items ?? [];
  return <View style={{ flex: 1, backgroundColor: theme.page }}><ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Pressable onPress={() => router.back()} style={{ padding: 8 }}><ChevronLeft color={theme.text} size={22} /></Pressable><View><Text style={{ color: theme.text, fontSize: 25, fontWeight: '900' }}>使用明细</Text><Text style={{ color: theme.subtext, marginTop: 3 }}>服务端实时统计与请求记录</Text></View></View>
    <View style={{ flexDirection: 'row', gap: 8 }}>{([['today', '今天'], ['week', '近 7 天'], ['month', '近 30 天']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setPeriod(value)} style={{ flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: period === value ? theme.primary : theme.card }}><Text style={{ color: period === value ? '#fff' : theme.subtext, fontSize: 12, fontWeight: '800' }}>{label}</Text></Pressable>)}</View>
    {stats.error || logs.error ? <Text style={{ color: theme.danger }}>{humanizeApiError(stats.error || logs.error)}</Text> : null}
    <View style={{ flexDirection: 'row', gap: 10 }}><Metric label="请求数" value={formatOptionalNumber(data.total_requests ?? data.requests)} /><Metric label="Token" value={formatOptionalNumber(data.total_tokens ?? data.tokens)} /><Metric label="费用" value={formatOptionalMoney(data.total_cost ?? data.cost)} /></View>
    <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 18, padding: 16 }}><Text style={{ color: theme.text, fontWeight: '900', fontSize: 16 }}>最近请求</Text>{logs.isLoading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} /> : items.length ? <View style={{ gap: 12, marginTop: 14 }}>{items.map((item) => <LogRow key={item.id} item={item} />)}</View> : <Text style={{ color: theme.subtext, marginTop: 18, textAlign: 'center' }}>该时间段暂无请求记录</Text>}</View>
  </ScrollView></View>;
}

function Metric({ label, value }: { label: string; value: string }) { return <View style={{ flex: 1, backgroundColor: theme.card, borderRadius: 16, borderColor: theme.border, borderWidth: 1, padding: 14 }}><Text style={{ color: theme.faint, fontSize: 11 }}>{label}</Text><Text style={{ color: theme.text, fontSize: 20, fontWeight: '900', marginTop: 7 }} numberOfLines={1}>{value}</Text></View>; }
function LogRow({ item }: { item: UsageLog }) { const failed = Number(item.status_code ?? 200) >= 400; return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomColor: theme.border, borderBottomWidth: 1, paddingBottom: 11 }}><View style={{ width: 31, height: 31, borderRadius: 10, backgroundColor: failed ? theme.dangerSoft : theme.successSoft, alignItems: 'center', justifyContent: 'center' }}><Activity color={failed ? theme.danger : theme.success} size={15} /></View><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }} numberOfLines={1}>{item.model || item.request_type || `请求 #${item.id}`}</Text><Text style={{ color: theme.subtext, fontSize: 11, marginTop: 3 }}>{item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : '--'} · {formatOptionalNumber(item.total_tokens)} tokens</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={{ color: failed ? theme.danger : theme.success, fontSize: 11, fontWeight: '800' }}>{failed ? String(item.status_code) : '成功'}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}><Clock3 color={theme.faint} size={10} /><Text style={{ color: theme.faint, fontSize: 10 }}>{item.duration_ms ? `${item.duration_ms}ms` : '--'}</Text></View></View></View>; }
