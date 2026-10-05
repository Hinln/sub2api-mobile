import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronRight, Filter, KeyRound, Plus, Search, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Badge, Card, Page, SectionTitle, StateCard } from '@/src/components/ui';
import { useDebouncedValue } from '@/src/hooks/use-debounced-value';
import { getDashboardStats, listUsers } from '@/src/services/admin';
import { theme } from '@/src/theme';
import type { AdminUser } from '@/src/types/admin';

type UserStatus = '' | 'active' | 'disabled';

const STATUS_FILTERS: { value: UserStatus; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'active', label: '正常' },
  { value: 'disabled', label: '已禁用' },
];

function money(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? `$${value.toFixed(2)}` : '--';
}

function count(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('zh-CN').format(value) : '--';
}

function lastSeen(value?: string | null) {
  if (!value) return '从未使用';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '时间未知';
  return `最近使用：${parsed.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}`;
}

function userTone(user: AdminUser) {
  if (user.status === 'disabled' || user.status === 'inactive') return { label: '已禁用', tone: 'danger' as const };
  return { label: '正常', tone: 'success' as const };
}

function roleLabel(role?: string) {
  if (role === 'admin' || role === 'administrator') return '管理员';
  if (role === 'developer') return '开发者';
  return '普通用户';
}

export default function UsersScreen() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<UserStatus>('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const keyword = useDebouncedValue(search.trim(), 300);
  const users = useQuery({
    queryKey: ['users', keyword, status, page],
    queryFn: () => listUsers(keyword, { page, page_size: 30, status: status || undefined, sort: 'created_at', order: 'desc' }),
  });
  const stats = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats, staleTime: 30_000 });
  const items = users.data?.items ?? [];
  const total = users.data?.total;
  const userCountLabel = users.isFetching
    ? '正在统计'
    : typeof total === 'number'
      ? `共 ${count(total)} 个用户`
      : users.error
        ? '总数未获取'
        : '--';

  return (
    <Page
      title="用户与密钥"
      subtitle="管理员专用 · 统一账号与权限管理"
      refreshing={users.isRefetching || stats.isRefetching}
      onRefresh={() => { void users.refetch(); void stats.refetch(); }}
      right={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            accessibilityLabel="toggle-user-filters"
            accessibilityState={{ expanded: showFilters }}
            onPress={() => setShowFilters((value) => !value)}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: pressed ? theme.primarySoft : theme.card, paddingHorizontal: 12, height: 42 })}
          >
            <Filter color={theme.primary} size={17} />
            <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '900' }}>筛选</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="create-user"
            accessibilityRole="button"
            onPress={() => router.push('/users/create-user')}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 14, backgroundColor: pressed ? theme.primary : theme.primarySoft, paddingHorizontal: 12, height: 42 })}
          >
            <Plus color={theme.primary} size={18} />
            <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '900' }}>新增用户</Text>
          </Pressable>
        </View>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, shadowColor: '#7C95C7', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 1 }}>
        <Search color={theme.faint} size={19} />
        <TextInput
          accessibilityLabel="search-users"
          value={search}
          onChangeText={(value) => { setSearch(value); setPage(1); }}
          placeholder="搜索用户（用户名 / 邮箱 / API Key）"
          placeholderTextColor={theme.faint}
          returnKeyType="search"
          style={{ flex: 1, color: theme.text, paddingVertical: 15, fontSize: 13 }}
        />
      </View>

      {showFilters ? <View style={{ flexDirection: 'row', gap: 5, marginTop: 12, borderRadius: 18, backgroundColor: theme.cardRaised, borderWidth: 1, borderColor: theme.border, padding: 4 }}>
        {STATUS_FILTERS.map((item) => {
          const selected = status === item.value;
          return <Pressable key={item.value || 'all'} onPress={() => { setStatus(item.value); setPage(1); }} style={{ flex: 1, alignItems: 'center', borderRadius: 14, backgroundColor: selected ? theme.primary : 'transparent', paddingHorizontal: 3, paddingVertical: 10 }}><Text numberOfLines={1} style={{ color: selected ? '#FFFFFF' : theme.subtext, fontSize: 11, fontWeight: '900' }}>{item.label}</Text></Pressable>;
        })}
      </View> : null}

      <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
        <Card style={{ flex: 1, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}><KeyRound color={theme.primary} size={18} /></View><Text style={{ flex: 1, color: theme.subtext, fontSize: 11 }}>API Key 总数</Text></View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.text, fontSize: 23, fontWeight: '900', marginTop: 11 }}>{count(stats.data?.total_api_keys)}</Text>
          <Text style={{ color: theme.faint, fontSize: 10, marginTop: 5 }}>服务端统计</Text>
        </Card>
        <Card style={{ flex: 1, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: theme.successSoft, alignItems: 'center', justifyContent: 'center' }}><UserRound color={theme.success} size={18} /></View><Text style={{ flex: 1, color: theme.subtext, fontSize: 11 }}>今日新增用户</Text></View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.text, fontSize: 23, fontWeight: '900', marginTop: 11 }}>{count(stats.data?.today_new_users)}</Text>
          <Text style={{ color: theme.faint, fontSize: 10, marginTop: 5 }}>服务端统计</Text>
        </Card>
      </View>

      <SectionTitle title="用户列表" action={<Text style={{ color: theme.subtext, fontSize: 12 }}>{userCountLabel}</Text>} />
      <StateCard loading={users.isLoading} error={users.error} empty={!users.isLoading && !users.error && items.length === 0} onRetry={() => void users.refetch()} emptyText="当前筛选条件下没有用户。" />
      <View style={{ gap: 10 }}>{items.map((user) => {
        const state = userTone(user);
        const administrator = user.role === 'admin' || user.role === 'administrator';
        return <Pressable key={user.id} accessibilityRole="button" onPress={() => router.push(`/users/${user.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}>
          <Card style={{ padding: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11 }}>
              <View style={{ width: 43, height: 43, borderRadius: 15, backgroundColor: administrator ? theme.primarySoft : theme.cardRaised, alignItems: 'center', justifyContent: 'center' }}><UserRound color={administrator ? theme.primary : theme.subtext} size={21} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><Text numberOfLines={1} style={{ flexShrink: 1, color: theme.text, fontSize: 15, fontWeight: '900' }}>{user.username || user.email}</Text>{administrator ? <Badge label="管理员" tone="primary" /> : null}</View>
                {user.username && user.username !== user.email ? <Text numberOfLines={1} style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>{user.email}</Text> : null}
              </View>
              <ChevronRight color={theme.faint} size={18} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: theme.border }}>
              <Badge label={roleLabel(user.role)} tone="primary" />
              <Badge label={state.label} tone={state.tone} />
              <Text numberOfLines={1} style={{ flex: 1, color: theme.subtext, fontSize: 11, textAlign: 'right' }}>{`余额 ${money(user.balance)} · 并发 ${typeof user.current_concurrency === 'number' ? user.current_concurrency : '--'}/${typeof user.concurrency === 'number' ? user.concurrency : '--'}`}</Text>
            </View>
            <Text style={{ color: theme.faint, fontSize: 10, marginTop: 8 }}>{lastSeen(user.last_used_at)}</Text>
          </Card>
        </Pressable>;
      })}</View>
      {(users.data?.pages ?? 1) > 1 ? <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18, marginTop: 18 }}><Pressable disabled={page <= 1} onPress={() => setPage((value) => value - 1)}><Text style={{ color: page <= 1 ? theme.faint : theme.primary, fontWeight: '800' }}>上一页</Text></Pressable><Text style={{ color: theme.subtext }}>{page} / {users.data?.pages}</Text><Pressable disabled={page >= (users.data?.pages ?? 1)} onPress={() => setPage((value) => value + 1)}><Text style={{ color: page >= (users.data?.pages ?? 1) ? theme.faint : theme.primary, fontWeight: '800' }}>下一页</Text></Pressable></View> : null}
    </Page>
  );
}
