import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Plus, Search, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Badge, Card, Page, StateCard } from '@/src/components/ui';
import { useDebouncedValue } from '@/src/hooks/use-debounced-value';
import { listUsers } from '@/src/services/admin';
import { theme } from '@/src/theme';

function money(value?: number) { return typeof value === 'number' ? `$${value.toFixed(2)}` : '--'; }

export default function UsersScreen() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const keyword = useDebouncedValue(search.trim(), 300);
  const query = useQuery({ queryKey: ['users', keyword, status, page], queryFn: () => listUsers(keyword, { page, page_size: 30, status: status || undefined, sort: 'created_at', order: 'desc' }) });
  const items = query.data?.items ?? [];

  return (
    <Page title={'\u7528\u6237'} subtitle={`\u5171 ${query.data?.total ?? '--'} \u4f4d\u7528\u6237`} refreshing={query.isRefetching} onRefresh={() => void query.refetch()} right={<Pressable accessibilityLabel="create-user" onPress={() => router.push('/users/create-user')} style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary }}><Plus color="#FFFFFF" size={20} /></Pressable>}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: theme.cardRaised, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14 }}><Search color={theme.faint} size={18} /><TextInput accessibilityLabel="search-users" value={search} onChangeText={(value) => { setSearch(value); setPage(1); }} placeholder={'\u641c\u7d22\u90ae\u7bb1\u3001\u7528\u6237\u540d\u6216\u5907\u6ce8'} placeholderTextColor={theme.faint} style={{ flex: 1, color: theme.text, paddingVertical: 13 }} /></View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 14 }}>{[['', '\u5168\u90e8'], ['active', '\u6b63\u5e38'], ['disabled', '\u5df2\u7981\u7528']].map(([value, label]) => <Pressable key={value} onPress={() => { setStatus(value); setPage(1); }} style={{ borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: status === value ? theme.primary : theme.cardRaised }}><Text style={{ color: status === value ? '#FFFFFF' : theme.subtext, fontSize: 11, fontWeight: '800' }}>{label}</Text></Pressable>)}</View>
      <StateCard loading={query.isLoading} error={query.error} empty={!query.isLoading && !query.error && items.length === 0} onRetry={() => void query.refetch()} emptyText={'\u6ca1\u6709\u5339\u914d\u7684\u7528\u6237\u3002'} />
      <View style={{ gap: 10 }}>{items.map((user) => {
        const disabled = ['disabled', 'inactive'].includes(user.status || '');
        return <Pressable key={user.id} onPress={() => router.push(`/users/${user.id}`)}><Card><View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}><View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}><UserRound color={theme.primary} size={19} /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: theme.text, fontSize: 15, fontWeight: '900' }}>{user.username || user.email}</Text><Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>{user.email}</Text><Text style={{ color: theme.faint, fontSize: 11, marginTop: 8 }}>{`\u4f59\u989d ${money(user.balance)} \u00b7 \u5e76\u53d1 ${user.current_concurrency ?? 0}/${user.concurrency ?? '--'} \u00b7 API Key \u8be6\u60c5\u4e2d\u53ef\u67e5`}</Text></View><Badge label={user.role === 'admin' ? 'ADMIN' : disabled ? '\u5df2\u7981\u7528' : '\u6b63\u5e38'} tone={user.role === 'admin' ? 'primary' : disabled ? 'danger' : 'success'} /></View></Card></Pressable>;
      })}</View>
      {(query.data?.pages ?? 1) > 1 ? <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18, marginTop: 18 }}><Pressable disabled={page <= 1} onPress={() => setPage((value) => value - 1)}><Text style={{ color: page <= 1 ? theme.faint : theme.primary, fontWeight: '800' }}>{'\u4e0a\u4e00\u9875'}</Text></Pressable><Text style={{ color: theme.subtext }}>{page} / {query.data?.pages}</Text><Pressable disabled={page >= (query.data?.pages ?? 1)} onPress={() => setPage((value) => value + 1)}><Text style={{ color: page >= (query.data?.pages ?? 1) ? theme.faint : theme.primary, fontWeight: '800' }}>{'\u4e0b\u4e00\u9875'}</Text></Pressable></View> : null}
    </Page>
  );
}
