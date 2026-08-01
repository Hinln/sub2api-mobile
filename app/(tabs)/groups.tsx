import { useQuery } from '@tanstack/react-query';
import { Layers3, Search } from 'lucide-react-native';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Badge, Card, Page, StateCard } from '@/src/components/ui';
import { useDebouncedValue } from '@/src/hooks/use-debounced-value';
import { listGroups } from '@/src/services/admin';
import { theme } from '@/src/theme';

export default function GroupsScreen() {
  const [search, setSearch] = useState('');
  const keyword = useDebouncedValue(search.trim(), 300);
  const query = useQuery({ queryKey: ['groups', keyword], queryFn: () => listGroups(keyword, { page_size: 100 }) });
  const items = query.data?.items ?? [];

  return (
    <Page title={'\u5206\u7ec4\u4e0e\u6a21\u578b'} subtitle={'\u53ea\u5c55\u793a\u540e\u7aef\u8fd4\u56de\u7684\u771f\u5b9e\u5206\u7ec4\u914d\u7f6e'} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: theme.cardRaised, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, marginBottom: 14 }}><Search color={theme.faint} size={18} /><TextInput value={search} onChangeText={setSearch} placeholder={'\u641c\u7d22\u5206\u7ec4'} placeholderTextColor={theme.faint} style={{ flex: 1, color: theme.text, paddingVertical: 13 }} /></View>
      <StateCard loading={query.isLoading} error={query.error} empty={!query.isLoading && !query.error && items.length === 0} onRetry={() => void query.refetch()} />
      <View style={{ gap: 10 }}>{items.map((group) => <Card key={group.id}><View style={{ flexDirection: 'row', gap: 12 }}><View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Layers3 color={theme.primary} size={19} /></View><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '900' }}>{group.name}</Text><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>{group.platform || '\u5e73\u53f0\u672a\u6807\u8bb0'}</Text><Text style={{ color: theme.faint, fontSize: 11, marginTop: 8 }}>{`\u8d26\u53f7 ${group.account_count ?? '--'} \u00b7 \u500d\u7387 ${(group.rate_multiplier ?? 1).toFixed(2)}x \u00b7 \u6392\u5e8f ${group.sort_order ?? '--'}`}</Text>{group.description ? <Text style={{ color: theme.subtext, fontSize: 11, lineHeight: 17, marginTop: 7 }}>{group.description}</Text> : null}</View><Badge label={group.status || '\u6b63\u5e38'} tone={group.status === 'disabled' ? 'danger' : 'success'} /></View></Card>)}</View>
    </Page>
  );
}
