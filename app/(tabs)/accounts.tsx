import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Gauge, KeyRound, Plus, Search, UsersRound } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Card, Page, StateCard } from '@/src/components/ui';
import { useDebouncedValue } from '@/src/hooks/use-debounced-value';
import { listAccounts } from '@/src/services/admin';
import { theme } from '@/src/theme';
import type { AdminAccount } from '@/src/types/admin';

const FILTERS = [
  { value: '', label: '\u5168\u90e8' },
  { value: 'active', label: '\u6b63\u5e38' },
  { value: 'error', label: '\u5f02\u5e38' },
  { value: 'inactive', label: '\u5df2\u505c\u7528' },
] as const;

const cardShadow = {
  shadowColor: '#25163D',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.045,
  shadowRadius: 14,
  elevation: 2,
};

function accountState(account: AdminAccount) {
  const status = account.status?.toLowerCase();
  if (account.error_message || status === 'error' || status === 'failed') {
    return { label: '\u5f02\u5e38', color: theme.danger, backgroundColor: theme.dangerSoft };
  }
  if (account.schedulable === false || (status && ['disabled', 'inactive', 'paused', 'stopped'].includes(status))) {
    return { label: '\u5df2\u505c\u7528', color: theme.subtext, backgroundColor: theme.muted };
  }
  if (account.schedulable === true || (status && ['active', 'normal', 'enabled'].includes(status))) {
    return { label: '\u6b63\u5e38', color: theme.success, backgroundColor: theme.successSoft };
  }
  return { label: status || '\u672a\u6807\u8bb0', color: theme.subtext, backgroundColor: theme.muted };
}

function StatusPill({ account }: { account: AdminAccount }) {
  const state = accountState(account);
  return (
    <View style={{ alignSelf: 'flex-start', borderRadius: 999, backgroundColor: state.backgroundColor, paddingHorizontal: 12, paddingVertical: 7 }}>
      <Text style={{ color: state.color, fontSize: 12, fontWeight: '800' }}>{state.label}</Text>
    </View>
  );
}

function formatActivity(account: AdminAccount) {
  if (account.error_message) return account.error_message;
  const timestamp = account.last_success_at || account.last_used_at || account.updated_at;
  if (!timestamp) return '\u540e\u7aef\u672a\u8fd4\u56de\u6700\u8fd1\u8c03\u7528\u65f6\u95f4';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return `${account.last_success_at ? '\u6700\u8fd1\u6210\u529f' : '\u6700\u8fd1\u66f4\u65b0'} ${date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
}

export default function AccountsScreen() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const keyword = useDebouncedValue(search.trim(), 300);
  const query = useQuery({
    queryKey: ['accounts', keyword, status, page],
    queryFn: () => listAccounts(keyword, { page, page_size: 30, status: status || undefined }),
  });
  const items = query.data?.items ?? [];
  const schedulableCount = items.filter((account) => account.schedulable !== false && !account.error_message && !['disabled', 'inactive', 'paused', 'error'].includes(account.status?.toLowerCase() || '')).length;

  return (
    <Page
      title={'\u4e0a\u6e38\u8d26\u53f7'}
      subtitle={'\u72b6\u6001\u3001\u8d1f\u8f7d\u3001\u51b7\u5374\u4e0e\u53ef\u8c03\u5ea6\u6027'}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      right={(
        <Pressable
          accessibilityLabel="create-account"
          onPress={() => router.push('/accounts/create')}
          style={({ pressed }) => ({
            width: 46,
            height: 46,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.primary,
            opacity: pressed ? 0.82 : 1,
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.22,
            shadowRadius: 10,
            elevation: 5,
          })}
        >
          <Plus color="#FFFFFF" size={25} strokeWidth={2.4} />
        </Pressable>
      )}
    >
      <View style={{
        minHeight: 54,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        borderRadius: 20,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
        paddingHorizontal: 16,
        ...cardShadow,
      }}>
        <Search color={theme.faint} size={21} strokeWidth={2} />
        <TextInput
          accessibilityLabel="search-accounts"
          value={search}
          onChangeText={(value) => { setSearch(value); setPage(1); }}
          placeholder={'\u641c\u7d22\u540d\u79f0\u6216\u5e73\u53f0'}
          placeholderTextColor={theme.faint}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={{ flex: 1, color: theme.text, fontSize: 15, paddingVertical: 14 }}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 16 }}>
        {FILTERS.map((filter) => {
          const selected = status === filter.value;
          return (
            <Pressable
              key={filter.value}
              onPress={() => { setStatus(filter.value); setPage(1); }}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: 'center',
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 10,
                backgroundColor: selected ? theme.primary : theme.cardRaised,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text numberOfLines={1} style={{ color: selected ? '#FFFFFF' : theme.subtext, fontSize: 12, fontWeight: '800' }}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {query.data ? (
        <Card style={{ paddingVertical: 16, paddingHorizontal: 18, marginBottom: 14, ...cardShadow }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <UsersRound color={theme.primary} size={21} strokeWidth={2.2} />
              </View>
              <Text style={{ color: theme.subtext, fontSize: 14 }}>{'\u5171 '}<Text style={{ color: theme.primary, fontSize: 20, fontWeight: '900' }}>{query.data.total}</Text>{' \u4e2a\u8d26\u53f7'}</Text>
            </View>
            <View style={{ width: 1, height: 40, backgroundColor: theme.border, marginHorizontal: 13 }} />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: theme.successSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Gauge color={theme.success} size={21} strokeWidth={2.2} />
              </View>
              <View>
                <Text style={{ color: theme.subtext, fontSize: 12 }}>{'\u672c\u9875\u53ef\u8c03\u5ea6'}</Text>
                <Text style={{ color: theme.success, fontSize: 20, lineHeight: 23, fontWeight: '900' }}>{schedulableCount}</Text>
              </View>
            </View>
          </View>
        </Card>
      ) : null}

      <StateCard
        loading={query.isLoading}
        error={query.error}
        empty={!query.isLoading && !query.error && items.length === 0}
        onRetry={() => void query.refetch()}
        emptyText={'\u6ca1\u6709\u5339\u914d\u7684\u4e0a\u6e38\u8d26\u53f7\u3002'}
      />

      <View style={{ gap: 12 }}>
        {items.map((account) => (
          <Pressable key={account.id} onPress={() => router.push(`/accounts/${account.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}>
            <Card style={{ padding: 16, ...cardShadow }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound color={theme.primary} size={27} strokeWidth={2.15} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: theme.text, fontSize: 17, lineHeight: 22, fontWeight: '900' }}>{account.name}</Text>
                  <Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 13, lineHeight: 18, marginTop: 3 }}>{`${account.platform}  \u00b7  ${account.type}`}</Text>
                  <Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 7 }}>{`\u5e76\u53d1 ${account.current_concurrency ?? 0}/${account.concurrency ?? '\u672a\u8bbe\u7f6e'}  \u00b7  \u4f18\u5148\u7ea7 ${account.priority ?? 0}  \u00b7  \u6743\u91cd ${account.rate_multiplier ?? 1}`}</Text>
                  <Text numberOfLines={1} style={{ color: account.error_message ? theme.danger : theme.faint, fontSize: 11, lineHeight: 17, marginTop: 3 }}>{formatActivity(account)}</Text>
                </View>
                <View style={{ alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <StatusPill account={account} />
                  <Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '700' }}>{'\u914d\u7f6e  \u203a'}</Text>
                </View>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>

      {(query.data?.pages ?? 1) > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 22, marginTop: 22 }}>
          <Pressable disabled={page <= 1} onPress={() => setPage((value) => value - 1)}>
            <Text style={{ color: page <= 1 ? theme.faint : theme.primary, fontWeight: '800' }}>{'\u4e0a\u4e00\u9875'}</Text>
          </Pressable>
          <Text style={{ color: theme.subtext, fontSize: 13 }}>{page} / {query.data?.pages}</Text>
          <Pressable disabled={page >= (query.data?.pages ?? 1)} onPress={() => setPage((value) => value + 1)}>
            <Text style={{ color: page >= (query.data?.pages ?? 1) ? theme.faint : theme.primary, fontWeight: '800' }}>{'\u4e0b\u4e00\u9875'}</Text>
          </Pressable>
        </View>
      ) : null}
    </Page>
  );
}
