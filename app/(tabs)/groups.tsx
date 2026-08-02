import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronRight, Layers3, Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Badge, Card, Page, StateCard } from '@/src/components/ui';
import { useDebouncedValue } from '@/src/hooks/use-debounced-value';
import { listGroups } from '@/src/services/admin';
import { theme } from '@/src/theme';

function statusLabel(status?: string) {
  if (status === 'active' || status === 'enabled' || status === 'normal') return '正常';
  if (status === 'disabled' || status === 'inactive') return '已停用';
  return status || '未标记';
}

function statusTone(status?: string): 'success' | 'danger' | 'muted' {
  if (status === 'active' || status === 'enabled' || status === 'normal') return 'success';
  if (status === 'disabled' || status === 'inactive') return 'danger';
  return 'muted';
}

function usd(value?: number | null) {
  return typeof value === 'number' ? `$${value.toFixed(2)}` : '--';
}

export default function GroupsScreen() {
  const [search, setSearch] = useState('');
  const keyword = useDebouncedValue(search.trim(), 300);
  const query = useQuery({ queryKey: ['groups', keyword], queryFn: () => listGroups(keyword, { page_size: 100 }) });
  const items = query.data?.items ?? [];

  return (
    <Page title="分组管理" subtitle="真实分组状态、平台、倍率与配额" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, marginBottom: 14 }}>
        <Search color={theme.faint} size={18} />
        <TextInput accessibilityLabel="search-groups" value={search} onChangeText={setSearch} placeholder="搜索分组名称" placeholderTextColor={theme.faint} style={{ flex: 1, color: theme.text, paddingVertical: 14 }} />
      </View>

      <Card style={{ marginBottom: 14, backgroundColor: theme.primarySoft }}>
        <Pressable onPress={() => router.push('/capabilities?module=models')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: '900' }}>分组数据已接入只读管理 API</Text>
            <Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 5 }}>模型绑定、权限编辑及分组写操作尚无已验证接口；点击查看能力边界。</Text>
          </View>
          <ChevronRight color={theme.primary} size={18} />
        </Pressable>
      </Card>

      <StateCard loading={query.isLoading} error={query.error} empty={!query.isLoading && !query.error && items.length === 0} emptyText="Hub 当前没有返回分组记录。" onRetry={() => void query.refetch()} />

      <View style={{ gap: 10 }}>
        {items.map((group) => {
          const limits = [
            `日 ${usd(group.daily_limit_usd)}`,
            `周 ${usd(group.weekly_limit_usd)}`,
            `月 ${usd(group.monthly_limit_usd)}`,
          ];
          return (
            <Card key={group.id}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Layers3 color={theme.primary} size={20} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontSize: 15, fontWeight: '900' }}>{group.name}</Text>
                    <Badge label={statusLabel(group.status)} tone={statusTone(group.status)} />
                  </View>
                  <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>{group.platform || '平台未返回'}{group.subscription_type ? ` · ${group.subscription_type}` : ''}</Text>
                  <Text style={{ color: theme.faint, fontSize: 11, marginTop: 8 }}>{`账号 ${group.account_count ?? '--'} · 倍率 ${typeof group.rate_multiplier === 'number' ? `${group.rate_multiplier.toFixed(2)}x` : '--'} · 排序 ${group.sort_order ?? '--'}`}</Text>
                  <Text style={{ color: theme.faint, fontSize: 11, marginTop: 6 }}>{`配额 ${limits.join(' · ')}`}</Text>
                  {typeof group.is_exclusive === 'boolean' ? <Text style={{ color: theme.faint, fontSize: 11, marginTop: 6 }}>{group.is_exclusive ? '独占分组' : '共享分组'}</Text> : null}
                  {group.description ? <Text style={{ color: theme.subtext, fontSize: 11, lineHeight: 17, marginTop: 8 }}>{group.description}</Text> : null}
                </View>
              </View>
            </Card>
          );
        })}
      </View>
    </Page>
  );
}
