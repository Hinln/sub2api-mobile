import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { KeyRound, Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Badge, Card, Page, StateCard } from '@/src/components/ui';
import { useDebouncedValue } from '@/src/hooks/use-debounced-value';
import { listAccounts } from '@/src/services/admin';
import { theme } from '@/src/theme';

function accountTone(status?: string, schedulable?: boolean, error?: string) {
  if (error || status === 'error') return 'danger' as const;
  if (schedulable === false || ['disabled', 'inactive', 'paused'].includes(status || '')) return 'muted' as const;
  return 'success' as const;
}

export default function AccountsScreen() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const keyword = useDebouncedValue(search.trim(), 300);
  const query = useQuery({ queryKey: ['accounts', keyword, status, page], queryFn: () => listAccounts(keyword, { page, page_size: 30, status: status || undefined }) });
  const items = query.data?.items ?? [];

  return (
    <Page title={'\u4e0a\u6e38\u8d26\u53f7'} subtitle={'\u72b6\u6001\u3001\u8d1f\u8f7d\u3001\u51b7\u5374\u4e0e\u53ef\u8c03\u5ea6\u6027'} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: theme.cardRaised, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14 }}><Search color={theme.faint} size={18} /><TextInput accessibilityLabel="search-accounts" value={search} onChangeText={(value) => { setSearch(value); setPage(1); }} placeholder={'\u641c\u7d22\u540d\u79f0\u6216\u5e73\u53f0'} placeholderTextColor={theme.faint} style={{ flex: 1, color: theme.text, paddingVertical: 13 }} /></View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 14 }}>{[['', '\u5168\u90e8'], ['active', '\u6b63\u5e38'], ['error', '\u5f02\u5e38'], ['disabled', '\u5df2\u505c\u7528']].map(([value, label]) => <Pressable key={value} onPress={() => { setStatus(value); setPage(1); }} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: status === value ? theme.primary : theme.cardRaised }}><Text style={{ color: status === value ? '#FFFFFF' : theme.subtext, fontSize: 11, fontWeight: '800' }}>{label}</Text></Pressable>)}</View>
      <StateCard loading={query.isLoading} error={query.error} empty={!query.isLoading && !query.error && items.length === 0} onRetry={() => void query.refetch()} emptyText={'\u6ca1\u6709\u5339\u914d\u7684\u4e0a\u6e38\u8d26\u53f7\u3002'} />
      <View style={{ gap: 10 }}>
        {items.map((account) => {
          const tone = accountTone(account.status, account.schedulable, account.error_message);
          return <Pressable key={account.id} onPress={() => router.push(`/accounts/${account.id}`)}><Card><View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}><View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}><KeyRound color={theme.primary} size={19} /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: theme.text, fontSize: 15, fontWeight: '900' }}>{account.name}</Text><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>{`${account.platform} \u00b7 ${account.type}`}</Text><Text style={{ color: theme.faint, fontSize: 11, marginTop: 8 }}>{`\u5e76\u53d1 ${account.current_concurrency ?? 0}/${account.concurrency ?? '--'} \u00b7 \u4f18\u5148\u7ea7 ${account.priority ?? 0} \u00b7 \u6743\u91cd ${account.rate_multiplier ?? 1}`}</Text>{account.error_message ? <Text numberOfLines={2} style={{ color: theme.danger, fontSize: 11, lineHeight: 17, marginTop: 7 }}>{account.error_message}</Text> : null}</View><Badge label={tone === 'success' ? '\u6b63\u5e38' : tone === 'danger' ? '\u5f02\u5e38' : '\u5df2\u6682\u505c'} tone={tone} /></View></Card></Pressable>;
        })}
      </View>
      {(query.data?.pages ?? 1) > 1 ? <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18, marginTop: 18 }}><Pressable disabled={page <= 1} onPress={() => setPage((value) => value - 1)}><Text style={{ color: page <= 1 ? theme.faint : theme.primary, fontWeight: '800' }}>{'\u4e0a\u4e00\u9875'}</Text></Pressable><Text style={{ color: theme.subtext }}>{page} / {query.data?.pages}</Text><Pressable disabled={page >= (query.data?.pages ?? 1)} onPress={() => setPage((value) => value + 1)}><Text style={{ color: page >= (query.data?.pages ?? 1) ? theme.faint : theme.primary, fontWeight: '800' }}>{'\u4e0b\u4e00\u9875'}</Text></Pressable></View> : null}
    </Page>
  );
}
