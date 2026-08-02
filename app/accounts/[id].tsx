import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Badge, Card, Metric, SectionTitle, StateCard } from '@/src/components/ui';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { formatTokenValue } from '@/src/lib/formatters';
import { queryClient } from '@/src/lib/query-client';
import { clearAccountError, getAccount, getAccountModels, getAccountStats, getAccountTodayStats, listUsageLogs, recoverAccountState, refreshAccount, setAccountSchedulable, testAccount } from '@/src/services/admin';
import { theme } from '@/src/theme';

function formatDuration(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}

export default function AccountDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const accountId = Number(params.id);
  const enabled = Number.isFinite(accountId);
  const account = useQuery({ queryKey: ['account', accountId], queryFn: () => getAccount(accountId), enabled });
  const today = useQuery({ queryKey: ['account-today', accountId], queryFn: () => getAccountTodayStats(accountId), enabled });
  const stats = useQuery({ queryKey: ['account-stats', accountId], queryFn: () => getAccountStats(accountId, 30), enabled });
  const models = useQuery({ queryKey: ['account-models', accountId], queryFn: () => getAccountModels(accountId), enabled });
  const recent = useQuery({ queryKey: ['account-logs', accountId], queryFn: () => listUsageLogs({ account_id: accountId, page_size: 5 }), enabled });
  const errors = useQuery({ queryKey: ['account-error-logs', accountId], queryFn: () => listUsageLogs({ account_id: accountId, page_size: 50 }), enabled });
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['account', accountId] });
    void queryClient.invalidateQueries({ queryKey: ['account-today', accountId] });
    void queryClient.invalidateQueries({ queryKey: ['account-stats', accountId] });
    void queryClient.invalidateQueries({ queryKey: ['account-models', accountId] });
    void queryClient.invalidateQueries({ queryKey: ['accounts'] });
  };
  const action = useMutation({
    mutationFn: async (name: 'test' | 'refresh' | 'recover' | 'clear' | 'toggle') => {
      if (name === 'test') return { name, result: await testAccount(accountId) };
      if (name === 'refresh') await refreshAccount(accountId);
      else if (name === 'recover') await recoverAccountState(accountId);
      else if (name === 'clear') await clearAccountError(accountId);
      else await setAccountSchedulable(accountId, account.data?.schedulable === false);
      return { name };
    },
    onSuccess: invalidate,
  });
  const item = account.data;
  const isError = Boolean(item?.error_message || item?.status === 'error');
  const paused = item?.schedulable === false || item?.status === 'inactive';
  const failedLogs = (errors.data?.items ?? []).filter((log) => log.status === 'error' || Boolean(log.error_message) || (log.status_code ?? 200) >= 400).slice(0, 5);

  function run(name: 'test' | 'refresh' | 'recover' | 'clear' | 'toggle', title: string, description: string, destructive = false) {
    Alert.alert(title, `${item?.name}\n${description}`, [{ text: '取消', style: 'cancel' }, { text: '确认', style: destructive ? 'destructive' : 'default', onPress: () => action.mutate(name) }]);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.page }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
      <StateCard loading={account.isLoading} error={account.error} onRetry={() => void account.refetch()} />
      {item ? <>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="key-outline" color={theme.primary} size={25} /></View>
            <View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 21, fontWeight: '900' }}>{item.name}</Text><Text style={{ color: theme.subtext, marginTop: 5 }}>{item.platform} · {item.type}</Text><Text style={{ color: theme.faint, fontSize: 10, marginTop: 8 }}>ID {item.id} · {item.updated_at ? new Date(item.updated_at).toLocaleString('zh-CN') : '--'}</Text></View>
            <Badge label={isError ? '异常' : paused ? '已停用' : '正常'} tone={isError ? 'danger' : paused ? 'muted' : 'success'} />
          </View>
          <Pressable onPress={() => router.push(`/accounts/${accountId}/edit`)} style={{ marginTop: 14, minHeight: 42, borderRadius: 14, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '900' }}>编辑配置与凭据</Text></Pressable>
          {item.error_message ? <View style={{ backgroundColor: theme.dangerSoft, borderRadius: 13, padding: 11, marginTop: 12 }}><Text selectable style={{ color: theme.danger, fontSize: 12, lineHeight: 18 }}>{item.error_message}</Text></View> : null}
        </Card>

        <SectionTitle title="运行指标" />
        <View style={{ flexDirection: 'row', gap: 9 }}><Metric label="今日请求" value={String(today.data?.requests ?? stats.data?.summary.today?.requests ?? '--')} /><Metric label="今日 Token" value={formatTokenValue(today.data?.tokens ?? stats.data?.summary.today?.tokens ?? 0)} /><Metric label="平均响应" value={formatDuration(stats.data?.summary.avg_duration_ms)} /></View>
        <View style={{ flexDirection: 'row', gap: 9, marginTop: 9 }}><Metric label="30 天请求" value={String(stats.data?.summary.total_requests ?? '--')} /><Metric label="30 天 Token" value={formatTokenValue(stats.data?.summary.total_tokens ?? 0)} /><Metric label="健康状态" value={isError ? '异常' : paused ? '停用' : '可调度'} tone={isError ? 'danger' : paused ? 'warning' : 'success'} /></View>

        <SectionTitle title="调度信息" />
        <Card>{[
          ['当前并发', `${item.current_concurrency ?? 0} / ${item.concurrency ?? '--'}`],
          ['优先级', String(item.priority ?? '--')],
          ['权重 / 计费倍率', String(item.rate_multiplier ?? 1)],
          ['最近使用', item.last_used_at ? new Date(item.last_used_at).toLocaleString('zh-CN') : '--'],
          ['冷却截止', item.rate_limit_reset_at ? new Date(item.rate_limit_reset_at).toLocaleString('zh-CN') : '--'],
          ['所属分组', item.groups?.map((group) => group.name).join(', ') || '--'],
        ].map(([label, value]) => <View key={label} style={{ flexDirection: 'row', gap: 12, paddingVertical: 9 }}><Text style={{ width: 108, color: theme.faint, fontSize: 12 }}>{label}</Text><Text selectable style={{ flex: 1, color: theme.text, fontSize: 12, textAlign: 'right' }}>{value}</Text></View>)}</Card>

        <SectionTitle title={`可用模型 (${models.data?.length ?? 0})`} />
        <StateCard loading={models.isLoading} error={models.error} empty={!models.isLoading && !models.error && (models.data?.length ?? 0) === 0} onRetry={() => void models.refetch()} emptyText="Hub 未返回此账号的可用模型。" />
        {(models.data?.length ?? 0) > 0 ? <Card><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{models.data!.slice(0, 20).map((model, index) => <Badge key={String(model.id || model.name || index)} label={String(model.display_name || model.name || model.id || 'unknown')} tone="primary" />)}</View></Card> : null}

        <SectionTitle title="连接与调度操作" />
        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
            <Pressable disabled={action.isPending} onPress={() => run('test', '测试账号连接', 'Hub 将执行真实连通性测试并返回延迟。')} style={{ borderRadius: 13, backgroundColor: theme.primarySoft, paddingHorizontal: 14, paddingVertical: 11 }}><Text style={{ color: theme.primary, fontWeight: '800' }}>测试连接</Text></Pressable>
            <Pressable disabled={action.isPending} onPress={() => run('refresh', '刷新账号', '刷新后端账号状态和凭据。')} style={{ borderRadius: 13, backgroundColor: theme.primarySoft, paddingHorizontal: 14, paddingVertical: 11 }}><Text style={{ color: theme.primary, fontWeight: '800' }}>刷新状态</Text></Pressable>
            {isError ? <Pressable disabled={action.isPending} onPress={() => run('clear', '清除错误', '清除已记录的错误状态。')} style={{ borderRadius: 13, backgroundColor: theme.warningSoft, paddingHorizontal: 14, paddingVertical: 11 }}><Text style={{ color: theme.warning, fontWeight: '800' }}>清除错误</Text></Pressable> : null}
            {isError ? <Pressable disabled={action.isPending} onPress={() => run('recover', '恢复账号状态', '请确认已排除凭据或上游问题。')} style={{ borderRadius: 13, backgroundColor: theme.warningSoft, paddingHorizontal: 14, paddingVertical: 11 }}><Text style={{ color: theme.warning, fontWeight: '800' }}>恢复状态</Text></Pressable> : null}
            <Pressable disabled={action.isPending} onPress={() => run('toggle', paused ? '恢复调度' : '暂停调度', paused ? '账号将重新进入可调度池。' : '新请求不再选择此账号。', !paused)} style={{ borderRadius: 13, backgroundColor: paused ? theme.successSoft : theme.dangerSoft, paddingHorizontal: 14, paddingVertical: 11 }}><Text style={{ color: paused ? theme.success : theme.danger, fontWeight: '800' }}>{paused ? '恢复调度' : '暂停调度'}</Text></Pressable>
          </View>
          {action.isPending ? <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 12 }}>正在处理...</Text> : null}
          {action.data?.name === 'test' && action.data.result ? <View style={{ borderRadius: 13, backgroundColor: action.data.result.success ? theme.successSoft : theme.dangerSoft, padding: 12, marginTop: 12 }}><Text style={{ color: action.data.result.success ? theme.success : theme.danger, fontWeight: '900' }}>{action.data.result.success ? '连接成功' : '连接失败'} · {formatDuration(action.data.result.latency_ms)}</Text><Text style={{ color: theme.subtext, fontSize: 11, lineHeight: 17, marginTop: 5 }}>{action.data.result.message}</Text></View> : null}
          {action.error ? <Text style={{ color: theme.danger, fontSize: 12, marginTop: 12 }}>{humanizeApiError(action.error)}</Text> : null}
        </Card>

        <SectionTitle title="最近调用" />
        <StateCard loading={recent.isLoading} error={recent.error} empty={!recent.isLoading && !recent.error && (recent.data?.items.length ?? 0) === 0} onRetry={() => void recent.refetch()} />
        <View style={{ gap: 9 }}>{recent.data?.items.map((log) => { const failed = log.status === 'error' || (log.status_code ?? 200) >= 400; return <Card key={log.id}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Ionicons name={failed ? 'warning-outline' : 'pulse-outline'} color={failed ? theme.danger : theme.success} size={18} /><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>{log.model || log.request_type || `Request #${log.id}`}</Text><Text style={{ color: theme.faint, fontSize: 10, marginTop: 5 }}>{log.created_at ? new Date(log.created_at).toLocaleString('zh-CN') : '--'} · {formatDuration(log.duration_ms)}</Text></View><Badge label={failed ? '失败' : '成功'} tone={failed ? 'danger' : 'success'} /></View></Card>; })}</View>

        <SectionTitle title={`错误记录（当前加载页 ${failedLogs.length}）`} />
        <StateCard loading={errors.isLoading} error={errors.error} empty={!errors.isLoading && !errors.error && failedLogs.length === 0} onRetry={() => void errors.refetch()} emptyText="当前加载页没有账号错误记录。" />
        <View style={{ gap: 9 }}>{failedLogs.map((log) => <Card key={log.id}><Text style={{ color: theme.danger, fontWeight: '800' }}>{log.model || log.request_type || `Request #${log.id}`}</Text><Text style={{ color: theme.subtext, fontSize: 11, lineHeight: 17, marginTop: 6 }}>{log.error_message || `HTTP ${log.status_code ?? '--'}`}</Text></Card>)}</View>
      </> : null}
    </ScrollView>
  );
}
