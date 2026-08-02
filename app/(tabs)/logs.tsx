import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Activity, Copy, Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Badge, Card, Page, StateCard } from '@/src/components/ui';
import { useDebouncedValue } from '@/src/hooks/use-debounced-value';
import { formatTokenValue } from '@/src/lib/formatters';
import { listUsageLogs } from '@/src/services/admin';
import { theme } from '@/src/theme';
import type { UsageLog } from '@/src/types/admin';

function duration(value?: number) {
  return typeof value === 'number' ? `${value.toFixed(0)} ms` : '--';
}

function dateTime(value?: string) {
  if (!value) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
}

function token(value?: number) {
  return typeof value === 'number' ? formatTokenValue(value) : '--';
}

function money(value?: number) {
  return typeof value === 'number' ? `$${value.toFixed(4)}` : '--';
}

function failed(log: UsageLog) {
  return log.status === 'error' || (log.status_code ?? 200) >= 400 || Boolean(log.error_message);
}

function userLabel(log: UsageLog) {
  return log.user?.email || log.user?.username || (log.user_id ? `用户 #${log.user_id}` : '用户未返回');
}

function accountLabel(log: UsageLog) {
  return log.account?.name || (log.account_id ? `账号 #${log.account_id}` : '账号未返回');
}

export default function LogsScreen() {
  const [search, setSearch] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<UsageLog>();
  const keyword = useDebouncedValue(search.trim(), 300);
  const modelKeyword = useDebouncedValue(model.trim(), 300);
  const query = useQuery({
    queryKey: ['usage-logs', keyword, modelKeyword, status, page],
    queryFn: () => listUsageLogs({ page, page_size: 50, model: modelKeyword || undefined }),
  });
  const items = (query.data?.items ?? []).filter((log) => {
    const matchesStatus = !status || (status === 'error' ? failed(log) : !failed(log));
    const haystack = `${log.request_id || ''} ${log.error_message || ''} ${log.model || ''} ${userLabel(log)} ${accountLabel(log)}`.toLowerCase();
    return matchesStatus && (!keyword || haystack.includes(keyword.toLowerCase()));
  });

  return (
    <Page title="请求日志" subtitle="真实模型调用、Token、耗时、成本与错误；关键词和状态筛选作用于当前加载页" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14 }}>
          <Search color={theme.faint} size={18} />
          <TextInput accessibilityLabel="search-logs" value={search} onChangeText={(value) => { setSearch(value); setPage(1); }} placeholder="搜索 Request ID 或错误" placeholderTextColor={theme.faint} style={{ flex: 1, color: theme.text, paddingVertical: 14 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14 }}>
          <Activity color={theme.faint} size={18} />
          <TextInput accessibilityLabel="filter-log-model" value={model} onChangeText={(value) => { setModel(value); setPage(1); }} autoCapitalize="none" autoCorrect={false} placeholder="按模型精确筛选" placeholderTextColor={theme.faint} style={{ flex: 1, color: theme.text, paddingVertical: 14 }} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 14 }}>
        {([['', '全部'], ['success', '成功'], ['error', '失败']] as const).map(([value, label]) => (
          <Pressable key={value} onPress={() => { setStatus(value); setPage(1); }} style={{ borderRadius: 999, paddingHorizontal: 15, paddingVertical: 9, backgroundColor: status === value ? theme.primary : theme.card }}>
            <Text style={{ color: status === value ? '#FFFFFF' : theme.subtext, fontSize: 12, fontWeight: '900' }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <StateCard loading={query.isLoading} error={query.error} empty={!query.isLoading && !query.error && items.length === 0} emptyText="当前筛选条件下没有请求记录。" onRetry={() => void query.refetch()} />

      <View style={{ gap: 10 }}>
        {items.map((log) => {
          const isFailed = failed(log);
          return (
            <Pressable key={log.id} accessibilityRole="button" onPress={() => setSelected(log)}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: isFailed ? theme.dangerSoft : theme.successSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Activity color={isFailed ? theme.danger : theme.success} size={19} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: theme.text, fontSize: 15, fontWeight: '900' }}>{log.model || log.request_type || `Request #${log.id}`}</Text>
                    <Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>{`${userLabel(log)} · ${accountLabel(log)}`}</Text>
                    <Text style={{ color: theme.faint, fontSize: 11, marginTop: 6 }}>{`${dateTime(log.created_at)} · ${duration(log.duration_ms)}`}</Text>
                    <Text numberOfLines={1} style={{ color: isFailed ? theme.danger : theme.subtext, fontSize: 11, marginTop: 7 }}>{isFailed ? log.error_message || `HTTP ${log.status_code ?? '--'}` : `Token ${token(log.total_tokens)} · 成本 ${money(log.cost)}`}</Text>
                  </View>
                  <Badge label={isFailed ? '失败' : '成功'} tone={isFailed ? 'danger' : 'success'} />
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      {(query.data?.pages ?? 1) > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18, marginTop: 18 }}>
          <Pressable disabled={page <= 1} onPress={() => setPage((value) => value - 1)}><Text style={{ color: page <= 1 ? theme.faint : theme.primary, fontWeight: '800' }}>上一页</Text></Pressable>
          <Text style={{ color: theme.subtext }}>{page} / {query.data?.pages}</Text>
          <Pressable disabled={page >= (query.data?.pages ?? 1)} onPress={() => setPage((value) => value + 1)}><Text style={{ color: page >= (query.data?.pages ?? 1) ? theme.faint : theme.primary, fontWeight: '800' }}>下一页</Text></Pressable>
        </View>
      ) : null}

      <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setSelected(undefined)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000099' }}>
          <View style={{ maxHeight: '86%', backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, color: theme.text, fontSize: 20, fontWeight: '900' }}>请求详情</Text>
              <Pressable accessibilityLabel="close-log-detail" onPress={() => setSelected(undefined)} style={{ padding: 8 }}><X color={theme.subtext} size={21} /></Pressable>
            </View>
            {selected ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingTop: 18, paddingBottom: 10 }}>
                {([
                  ['Request ID', selected.request_id || '--'],
                  ['用户', userLabel(selected)],
                  ['模型', selected.model || '--'],
                  ['调用账号', accountLabel(selected)],
                  ['请求类型', selected.request_type || '--'],
                  ['状态', failed(selected) ? '失败' : '成功'],
                  ['HTTP', String(selected.status_code ?? '--')],
                  ['输入 Token', token(selected.input_tokens)],
                  ['输出 Token', token(selected.output_tokens)],
                  ['缓存读取 Token', token(selected.cache_read_tokens)],
                  ['总 Token', token(selected.total_tokens)],
                  ['成本', money(selected.cost)],
                  ['实际成本', money(selected.actual_cost)],
                  ['响应耗时', duration(selected.duration_ms)],
                  ['时间', dateTime(selected.created_at)],
                  ['错误信息', selected.error_message || '--'],
                ] as [string, string][]).map(([label, value]) => (
                  <View key={label}>
                    <Text style={{ color: theme.faint, fontSize: 11 }}>{label}</Text>
                    <Text selectable style={{ color: label === '错误信息' && value !== '--' ? theme.danger : theme.text, fontSize: 13, lineHeight: 19, marginTop: 4 }}>{value}</Text>
                  </View>
                ))}
                {selected.request_id ? (
                  <Pressable onPress={() => void Clipboard.setStringAsync(selected.request_id!)} style={{ flexDirection: 'row', gap: 8, alignSelf: 'flex-start', backgroundColor: theme.primarySoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }}>
                    <Copy color={theme.primary} size={15} />
                    <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>复制 Request ID</Text>
                  </Pressable>
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </Page>
  );
}
