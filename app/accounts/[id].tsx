import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Badge, Card, Metric, SectionTitle, StateCard } from '@/src/components/ui';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { queryClient } from '@/src/lib/query-client';
import { clearAccountError, getAccount, getAccountTodayStats, recoverAccountState, refreshAccount, setAccountSchedulable, testAccount } from '@/src/services/admin';
import { theme } from '@/src/theme';

export default function AccountDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const accountId = Number(params.id);
  const account = useQuery({ queryKey: ['account', accountId], queryFn: () => getAccount(accountId), enabled: Number.isFinite(accountId) });
  const today = useQuery({ queryKey: ['account-today', accountId], queryFn: () => getAccountTodayStats(accountId), enabled: Number.isFinite(accountId) });
  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: ['account', accountId] }); void queryClient.invalidateQueries({ queryKey: ['accounts'] }); };
  const action = useMutation({ mutationFn: async (name: 'test' | 'refresh' | 'recover' | 'clear' | 'toggle') => {
    if (name === 'test') return testAccount(accountId);
    if (name === 'refresh') return refreshAccount(accountId);
    if (name === 'recover') return recoverAccountState(accountId);
    if (name === 'clear') return clearAccountError(accountId);
    return setAccountSchedulable(accountId, account.data?.schedulable === false);
  }, onSuccess: invalidate });
  const item = account.data;
  const isError = Boolean(item?.error_message || item?.status === 'error');
  const paused = item?.schedulable === false;

  function run(name: 'test' | 'refresh' | 'recover' | 'clear' | 'toggle', title: string, description: string, destructive = false) {
    Alert.alert(title, `${item?.name}\n${description}`, [{ text: '\u53d6\u6d88', style: 'cancel' }, { text: '\u786e\u8ba4', style: destructive ? 'destructive' : 'default', onPress: () => action.mutate(name) }]);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.page }} contentContainerStyle={{ padding: 16, paddingBottom: 44 }}>
      <StateCard loading={account.isLoading} error={account.error} onRetry={() => void account.refetch()} />
      {item ? <>
        <Card><View style={{ flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 21, fontWeight: '900' }}>{item.name}</Text><Text style={{ color: theme.subtext, marginTop: 6 }}>{item.platform} {'\u00b7'} {item.type}</Text><Text style={{ color: theme.faint, fontSize: 11, marginTop: 9 }}>ID {item.id} {'\u00b7'} {item.updated_at ? new Date(item.updated_at).toLocaleString('zh-CN') : '--'}</Text></View><Badge label={isError ? '\u5f02\u5e38' : paused ? '\u5df2\u6682\u505c' : '\u6b63\u5e38'} tone={isError ? 'danger' : paused ? 'muted' : 'success'} /></View>{item.error_message ? <View style={{ backgroundColor: theme.dangerSoft, borderRadius: 13, padding: 11, marginTop: 14 }}><Text selectable style={{ color: theme.danger, fontSize: 12, lineHeight: 18 }}>{item.error_message}</Text></View> : null}</Card>

        <SectionTitle title={'\u4eca\u65e5\u7528\u91cf'} />
        <View style={{ flexDirection: 'row', gap: 9 }}><Metric label={'\u8bf7\u6c42'} value={String(today.data?.requests ?? '--')} /><Metric label="Token" value={String(today.data?.tokens ?? '--')} /><Metric label={'\u6210\u672c'} value={typeof today.data?.cost === 'number' ? `$${today.data.cost.toFixed(2)}` : '--'} tone="warning" /></View>

        <SectionTitle title={'\u8c03\u5ea6\u4fe1\u606f'} />
        <Card>{[
          ['\u5f53\u524d\u5e76\u53d1', `${item.current_concurrency ?? 0} / ${item.concurrency ?? '--'}`], ['\u4f18\u5148\u7ea7', String(item.priority ?? '--')], ['\u6743\u91cd / \u500d\u7387', String(item.rate_multiplier ?? 1)], ['\u6700\u8fd1\u4f7f\u7528', item.last_used_at ? new Date(item.last_used_at).toLocaleString('zh-CN') : '--'], ['\u51b7\u5374\u622a\u6b62', item.rate_limit_reset_at ? new Date(item.rate_limit_reset_at).toLocaleString('zh-CN') : '--'], ['\u6240\u5c5e\u5206\u7ec4', item.groups?.map((group) => group.name).join(', ') || '--'],
        ].map(([label, value]) => <View key={label} style={{ flexDirection: 'row', gap: 12, paddingVertical: 9 }}><Text style={{ width: 100, color: theme.faint, fontSize: 12 }}>{label}</Text><Text selectable style={{ flex: 1, color: theme.text, fontSize: 12, textAlign: 'right' }}>{value}</Text></View>)}</Card>

        <SectionTitle title={'\u5b89\u5168\u64cd\u4f5c'} />
        <Card><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
          <Pressable disabled={action.isPending} onPress={() => run('test', '\u6d4b\u8bd5\u8d26\u53f7', '\u540e\u7aef\u5c06\u6267\u884c\u73b0\u6709\u7684\u8d26\u53f7\u8fde\u901a\u6027\u6d4b\u8bd5\u3002')} style={{ borderRadius: 13, backgroundColor: theme.primarySoft, paddingHorizontal: 14, paddingVertical: 11 }}><Text style={{ color: theme.primary, fontWeight: '800' }}>{'\u6d4b\u8bd5'}</Text></Pressable>
          <Pressable disabled={action.isPending} onPress={() => run('refresh', '\u5237\u65b0\u8d26\u53f7', '\u5237\u65b0\u540e\u7aef\u8d26\u53f7\u72b6\u6001\u548c\u914d\u989d\u3002')} style={{ borderRadius: 13, backgroundColor: theme.primarySoft, paddingHorizontal: 14, paddingVertical: 11 }}><Text style={{ color: theme.primary, fontWeight: '800' }}>{'\u5237\u65b0\u72b6\u6001'}</Text></Pressable>
          {isError ? <Pressable disabled={action.isPending} onPress={() => run('clear', '\u6e05\u9664\u9519\u8bef', '\u4ec5\u6e05\u9664\u5df2\u8bb0\u5f55\u7684\u9519\u8bef\u72b6\u6001\uff0c\u4e0d\u4f1a\u4fee\u6539\u51ed\u636e\u3002')} style={{ borderRadius: 13, backgroundColor: theme.warningSoft, paddingHorizontal: 14, paddingVertical: 11 }}><Text style={{ color: theme.warning, fontWeight: '800' }}>{'\u6e05\u9664\u9519\u8bef'}</Text></Pressable> : null}
          {isError ? <Pressable disabled={action.isPending} onPress={() => run('recover', '\u6062\u590d\u8d26\u53f7\u72b6\u6001', '\u8bf7\u786e\u8ba4\u5df2\u6392\u9664\u51ed\u636e\u6216\u4e0a\u6e38\u95ee\u9898\u3002')} style={{ borderRadius: 13, backgroundColor: theme.warningSoft, paddingHorizontal: 14, paddingVertical: 11 }}><Text style={{ color: theme.warning, fontWeight: '800' }}>{'\u6062\u590d\u72b6\u6001'}</Text></Pressable> : null}
          <Pressable disabled={action.isPending} onPress={() => run('toggle', paused ? '\u6062\u590d\u8c03\u5ea6' : '\u6682\u505c\u8c03\u5ea6', paused ? '\u8d26\u53f7\u5c06\u91cd\u65b0\u8fdb\u5165\u53ef\u8c03\u5ea6\u6c60\u3002' : '\u65b0\u8bf7\u6c42\u4e0d\u518d\u9009\u62e9\u6b64\u8d26\u53f7\u3002', !paused)} style={{ borderRadius: 13, backgroundColor: paused ? theme.successSoft : theme.dangerSoft, paddingHorizontal: 14, paddingVertical: 11 }}><Text style={{ color: paused ? theme.success : theme.danger, fontWeight: '800' }}>{paused ? '\u6062\u590d\u8c03\u5ea6' : '\u6682\u505c\u8c03\u5ea6'}</Text></Pressable>
        </View>{action.isPending ? <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 12 }}>{'\u6b63\u5728\u5904\u7406...'}</Text> : null}{action.error ? <Text style={{ color: theme.danger, fontSize: 12, marginTop: 12 }}>{humanizeApiError(action.error)}</Text> : null}</Card>
      </> : null}
    </ScrollView>
  );
}
