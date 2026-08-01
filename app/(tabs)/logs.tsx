import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Activity, Copy, Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

import { Badge, Card, Page, StateCard } from '@/src/components/ui';
import { useDebouncedValue } from '@/src/hooks/use-debounced-value';
import { formatTokenValue } from '@/src/lib/formatters';
import { listUsageLogs } from '@/src/services/admin';
import { theme } from '@/src/theme';
import type { UsageLog } from '@/src/types/admin';

function duration(value?: number) { return typeof value === 'number' ? `${value.toFixed(0)} ms` : '--'; }

export default function LogsScreen() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<UsageLog>();
  const keyword = useDebouncedValue(search.trim(), 300);
  const query = useQuery({ queryKey: ['usage-logs', keyword, status, page], queryFn: () => listUsageLogs({ page, page_size: 30, search: keyword, status: status || undefined }) });
  const items = query.data?.items ?? [];

  return (
    <Page title={'\u8bf7\u6c42\u65e5\u5fd7'} subtitle={'\u6309\u65f6\u95f4\u67e5\u770b\u6a21\u578b\u8c03\u7528\u3001Token\u3001\u8017\u65f6\u4e0e\u9519\u8bef'} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: theme.cardRaised, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14 }}><Search color={theme.faint} size={18} /><TextInput accessibilityLabel="search-logs" value={search} onChangeText={(value) => { setSearch(value); setPage(1); }} placeholder={'\u641c\u7d22 Request ID\u3001\u6a21\u578b\u6216\u9519\u8bef'} placeholderTextColor={theme.faint} style={{ flex: 1, color: theme.text, paddingVertical: 13 }} /></View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 14 }}>{[['', '\u5168\u90e8'], ['success', '\u6210\u529f'], ['error', '\u5931\u8d25']].map(([value, label]) => <Pressable key={value} onPress={() => { setStatus(value); setPage(1); }} style={{ borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: status === value ? theme.primary : theme.cardRaised }}><Text style={{ color: status === value ? '#FFFFFF' : theme.subtext, fontSize: 11, fontWeight: '800' }}>{label}</Text></Pressable>)}</View>
      <StateCard loading={query.isLoading} error={query.error} empty={!query.isLoading && !query.error && items.length === 0} onRetry={() => void query.refetch()} />
      <View style={{ gap: 10 }}>{items.map((log) => {
        const failed = log.status === 'error' || (log.status_code ?? 200) >= 400 || Boolean(log.error_message);
        return <Pressable key={log.id} onPress={() => setSelected(log)}><Card><View style={{ flexDirection: 'row', gap: 12 }}><View style={{ width: 39, height: 39, borderRadius: 13, backgroundColor: failed ? theme.dangerSoft : theme.successSoft, alignItems: 'center', justifyContent: 'center' }}><Activity color={failed ? theme.danger : theme.success} size={18} /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: theme.text, fontWeight: '900' }}>{log.model || log.request_type || `Request #${log.id}`}</Text><Text style={{ color: theme.subtext, fontSize: 11, marginTop: 5 }}>{`${log.created_at ? new Date(log.created_at).toLocaleString('zh-CN') : '--'} \u00b7 ${duration(log.duration_ms)}`}</Text><Text numberOfLines={1} style={{ color: failed ? theme.danger : theme.faint, fontSize: 11, marginTop: 7 }}>{failed ? log.error_message || `HTTP ${log.status_code}` : `Token ${formatTokenValue(log.total_tokens ?? 0)} \u00b7 $${(log.cost ?? 0).toFixed(4)}`}</Text></View><Badge label={failed ? String(log.status_code || 'ERR') : 'OK'} tone={failed ? 'danger' : 'success'} /></View></Card></Pressable>;
      })}</View>
      {(query.data?.pages ?? 1) > 1 ? <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18, marginTop: 18 }}><Pressable disabled={page <= 1} onPress={() => setPage((value) => value - 1)}><Text style={{ color: page <= 1 ? theme.faint : theme.primary, fontWeight: '800' }}>{'\u4e0a\u4e00\u9875'}</Text></Pressable><Text style={{ color: theme.subtext }}>{page} / {query.data?.pages}</Text><Pressable disabled={page >= (query.data?.pages ?? 1)} onPress={() => setPage((value) => value + 1)}><Text style={{ color: page >= (query.data?.pages ?? 1) ? theme.faint : theme.primary, fontWeight: '800' }}>{'\u4e0b\u4e00\u9875'}</Text></Pressable></View> : null}

      <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setSelected(undefined)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000099' }}><View style={{ maxHeight: '82%', backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, color: theme.text, fontSize: 20, fontWeight: '900' }}>{'\u65e5\u5fd7\u8be6\u60c5'}</Text><Pressable accessibilityLabel="close-log-detail" onPress={() => setSelected(undefined)} style={{ padding: 8 }}><X color={theme.subtext} size={21} /></Pressable></View>{selected ? <View style={{ gap: 12, marginTop: 18 }}>{[
          ['Request ID', selected.request_id || '--'], ['\u6a21\u578b', selected.model || '--'], ['HTTP', String(selected.status_code ?? '--')], ['\u8bf7\u6c42\u7c7b\u578b', selected.request_type || '--'], ['Token', formatTokenValue(selected.total_tokens ?? 0)], ['\u8017\u65f6', duration(selected.duration_ms)], ['\u65f6\u95f4', selected.created_at ? new Date(selected.created_at).toLocaleString('zh-CN') : '--'], ['\u9519\u8bef', selected.error_message || '--'],
        ].map(([label, value]) => <View key={label}><Text style={{ color: theme.faint, fontSize: 11 }}>{label}</Text><Text selectable style={{ color: theme.text, fontSize: 13, lineHeight: 19, marginTop: 4 }}>{value}</Text></View>)}{selected.request_id ? <Pressable onPress={() => void Clipboard.setStringAsync(selected.request_id!)} style={{ flexDirection: 'row', gap: 8, alignSelf: 'flex-start', backgroundColor: theme.primarySoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }}><Copy color={theme.primary} size={15} /><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>{'\u590d\u5236 Request ID'}</Text></Pressable> : null}</View> : null}</View></View>
      </Modal>
    </Page>
  );
}
