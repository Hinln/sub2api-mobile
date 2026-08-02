import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Plus, Search, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Card, Page, StateCard } from '@/src/components/ui';
import { useDebouncedValue } from '@/src/hooks/use-debounced-value';
import { listUsers } from '@/src/services/admin';
import { theme } from '@/src/theme';
import type { AdminUser } from '@/src/types/admin';

const FILTERS = [
  { value: '', label: '\u5168\u90e8' },
  { value: 'active', label: '\u6b63\u5e38' },
  { value: 'disabled', label: '\u5df2\u7981\u7528' },
] as const;

const cardShadow = {
  shadowColor: '#25163D',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.045,
  shadowRadius: 14,
  elevation: 2,
};

function money(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? `$${value.toFixed(2)}` : '\u672a\u8fd4\u56de';
}

function userStatus(user: AdminUser) {
  const status = user.status?.toLowerCase();
  if (status && ['disabled', 'inactive', 'blocked', 'suspended'].includes(status)) {
    return { label: '\u5df2\u7981\u7528', color: theme.danger, backgroundColor: theme.dangerSoft };
  }
  if (status && ['active', 'normal', 'enabled'].includes(status)) {
    return { label: '\u6b63\u5e38', color: theme.success, backgroundColor: theme.successSoft };
  }
  return { label: status || '\u672a\u6807\u8bb0', color: theme.subtext, backgroundColor: theme.muted };
}

function StatusPill({ user }: { user: AdminUser }) {
  const status = userStatus(user);
  return (
    <View style={{ borderRadius: 999, backgroundColor: status.backgroundColor, paddingHorizontal: 12, paddingVertical: 7 }}>
      <Text style={{ color: status.color, fontSize: 12, fontWeight: '800' }}>{status.label}</Text>
    </View>
  );
}

export default function UsersScreen() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const keyword = useDebouncedValue(search.trim(), 300);
  const query = useQuery({
    queryKey: ['users', keyword, status, page],
    queryFn: () => listUsers(keyword, { page, page_size: 30, status: status || undefined, sort: 'created_at', order: 'desc' }),
  });
  const items = query.data?.items ?? [];
  const total = query.data?.total;

  return (
    <Page
      title={'\u7528\u6237'}
      subtitle={typeof total === 'number' ? `\u5171 ${total} \u4f4d\u7528\u6237` : '\u6b63\u5728\u8bfb\u53d6\u7528\u6237\u603b\u6570'}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      right={(
        <Pressable
          accessibilityLabel="create-user"
          onPress={() => router.push('/users/create-user')}
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
          accessibilityLabel="search-users"
          value={search}
          onChangeText={(value) => { setSearch(value); setPage(1); }}
          placeholder={'\u641c\u7d22\u90ae\u7bb1\u3001\u7528\u6237\u540d\u6216\u5907\u6ce8'}
          placeholderTextColor={theme.faint}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={{ flex: 1, color: theme.text, fontSize: 15, paddingVertical: 14 }}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 16 }}>
        {FILTERS.map((filter) => {
          const selected = status === filter.value;
          return (
            <Pressable
              key={filter.value}
              onPress={() => { setStatus(filter.value); setPage(1); }}
              style={({ pressed }) => ({
                minWidth: 72,
                alignItems: 'center',
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: selected ? theme.primary : theme.cardRaised,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: selected ? '#FFFFFF' : theme.subtext, fontSize: 13, fontWeight: '800' }}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <StateCard
        loading={query.isLoading}
        error={query.error}
        empty={!query.isLoading && !query.error && items.length === 0}
        onRetry={() => void query.refetch()}
        emptyText={'\u6ca1\u6709\u5339\u914d\u7684\u7528\u6237\u3002'}
      />

      <View style={{ gap: 12 }}>
        {items.map((user) => {
          const displayName = user.username?.trim() || user.email;
          const concurrency = `${user.current_concurrency ?? 0}/${user.concurrency ?? '\u672a\u8bbe\u7f6e'}`;
          return (
            <Pressable key={user.id} onPress={() => router.push(`/users/${user.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}>
              <Card style={{ padding: 16, ...cardShadow }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ width: 50, height: 50, borderRadius: 17, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                    <UserRound color={theme.primary} size={25} strokeWidth={2.15} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: theme.text, fontSize: 17, lineHeight: 22, fontWeight: '900' }}>{displayName}</Text>
                    <Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 13, lineHeight: 18, marginTop: 4 }}>{user.email}</Text>
                    <Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 7 }}>
                      {`\u4f59\u989d ${money(user.balance)}  \u00b7  \u5e76\u53d1 ${concurrency}  \u00b7  API Key \u8be6\u60c5\u53ef\u67e5${user.role === 'admin' ? '  \u00b7  \u7ba1\u7406\u5458' : ''}`}
                    </Text>
                  </View>
                  <StatusPill user={user} />
                </View>
              </Card>
            </Pressable>
          );
        })}
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
