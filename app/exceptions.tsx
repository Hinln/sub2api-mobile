import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, ChevronRight, CircleAlert } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Badge, Card, Page, SectionTitle, StateCard } from '@/src/components/ui';
import { listAccounts, listUsageLogs } from '@/src/services/admin';
import { theme } from '@/src/theme';
import type { UsageLog } from '@/src/types/admin';

type ExceptionKind = 'api' | 'upstream' | 'timeout' | 'quota';

const CATEGORY_LABELS: Record<ExceptionKind, string> = {
  api: 'API 错误',
  upstream: '上游失败',
  timeout: '超时',
  quota: '额度不足',
};

function classify(entry: UsageLog): ExceptionKind {
  const message = (entry.error_message || '').toLowerCase();
  const code = entry.status_code ?? 0;
  if (code === 402 || /quota|balance|credit|额度|余额|deactivated/.test(message)) return 'quota';
  if (code === 408 || code === 504 || /timeout|timed out|超时/.test(message)) return 'timeout';
  if (code >= 500 || /upstream|provider|workspace|上游/.test(message)) return 'upstream';
  return 'api';
}

function summary(entry: UsageLog) {
  const kind = classify(entry);
  if (kind === 'quota') return '额度或工作区不可用';
  if (kind === 'timeout') return '请求响应超时';
  if (kind === 'upstream') return '上游服务异常';
  if (entry.status_code === 401) return '认证信息已失效';
  if (entry.status_code === 429) return '请求频率受限';
  return 'API 请求失败';
}

function requestIdentity(entry: UsageLog) {
  return entry.model || entry.request_type || `Request #${entry.id}`;
}

export default function ExceptionsScreen() {
  const logs = useQuery({ queryKey: ['exception-center-logs'], queryFn: () => listUsageLogs({ page_size: 100 }), staleTime: 30_000 });
  const accounts = useQuery({ queryKey: ['exception-center-accounts'], queryFn: () => listAccounts('', { page_size: 50 }), staleTime: 30_000 });
  const failed = (logs.data?.items ?? []).filter((entry) => entry.status === 'error' || Boolean(entry.error_message) || (entry.status_code ?? 200) >= 400);
  const accountProblems = (accounts.data?.items ?? []).filter((account) => account.status === 'error' || Boolean(account.error_message));
  const counts = failed.reduce<Record<ExceptionKind, number>>((result, entry) => {
    result[classify(entry)] += 1;
    return result;
  }, { api: 0, upstream: 0, timeout: 0, quota: 0 });
  const refresh = () => { void logs.refetch(); void accounts.refetch(); };

  return (
    <Page
      title="异常中心"
      subtitle={`当前加载页发现 ${failed.length} 条失败；分类基于真实请求日志`}
      refreshing={logs.isRefetching || accounts.isRefetching}
      onRefresh={refresh}
    >
      <StateCard loading={logs.isLoading || accounts.isLoading} error={logs.error || accounts.error} onRetry={refresh} />
      {!logs.isLoading && !accounts.isLoading && !(logs.error || accounts.error) ? (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Card style={{ flex: 1, backgroundColor: theme.dangerSoft }}>
              <Text style={{ color: theme.danger, fontSize: 11 }}>当前页失败请求</Text>
              <Text style={{ color: theme.danger, fontSize: 25, fontWeight: '900', marginTop: 6 }}>{failed.length}</Text>
            </Card>
            <Card style={{ flex: 1 }}>
              <Text style={{ color: theme.subtext, fontSize: 11 }}>异常账号（当前页）</Text>
              <Text style={{ color: theme.text, fontSize: 25, fontWeight: '900', marginTop: 6 }}>{accountProblems.length}</Text>
            </Card>
          </View>

          <SectionTitle title="异常聚合" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {(Object.keys(CATEGORY_LABELS) as ExceptionKind[]).map((kind) => (
              <Card key={kind} style={{ width: '48%', flexGrow: 1, minWidth: 140 }}>
                <Text style={{ color: theme.subtext, fontSize: 12 }}>{CATEGORY_LABELS[kind]}</Text>
                <Text style={{ color: counts[kind] > 0 ? theme.danger : theme.text, fontSize: 22, fontWeight: '900', marginTop: 7 }}>{counts[kind]}</Text>
                <Text style={{ color: theme.faint, fontSize: 10, marginTop: 4 }}>当前加载页</Text>
              </Card>
            ))}
          </View>

          <SectionTitle title="失败请求" action={<Pressable onPress={() => router.push('/logs')}><Text style={{ color: theme.primary, fontWeight: '800', fontSize: 12 }}>查看全部</Text></Pressable>} />
          {failed.length ? (
            <View style={{ gap: 9 }}>
              {failed.map((entry) => (
                <Pressable key={entry.id} onPress={() => router.push('/logs')}>
                  <Card>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <CircleAlert color={theme.danger} size={19} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '900' }}>{requestIdentity(entry)}</Text>
                        <Text style={{ color: theme.danger, fontSize: 12, fontWeight: '800', marginTop: 5 }}>{summary(entry)}</Text>
                        <Text numberOfLines={2} style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 5 }}>{entry.error_message || `HTTP ${entry.status_code ?? '--'}`}</Text>
                        <Text numberOfLines={1} style={{ color: theme.faint, fontSize: 11, marginTop: 6 }}>{`Request ID ${entry.request_id || '--'} · ${entry.created_at ? new Date(entry.created_at).toLocaleString('zh-CN') : '--'}`}</Text>
                      </View>
                      <Badge label={String(entry.status_code ?? 'ERR')} tone="danger" />
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : <Card><Text style={{ color: theme.subtext, textAlign: 'center' }}>当前查询范围内没有失败日志。</Text></Card>}

          <SectionTitle title="账号异常" action={<Pressable onPress={() => router.push('/accounts')}><Text style={{ color: theme.primary, fontWeight: '800', fontSize: 12 }}>查看账号</Text></Pressable>} />
          {accountProblems.length ? (
            <View style={{ gap: 9 }}>
              {accountProblems.map((account) => (
                <Pressable key={account.id} onPress={() => router.push(`/accounts/${account.id}`)}>
                  <Card>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <AlertTriangle color={theme.warning} size={19} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: theme.text, fontWeight: '900' }}>{account.name}</Text>
                        <Text numberOfLines={2} style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 5 }}>{account.error_message || '后端已将该账号标记为异常。'}</Text>
                      </View>
                      <ChevronRight color={theme.faint} size={18} />
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : <Card><Text style={{ color: theme.subtext, textAlign: 'center' }}>当前已加载账号中没有异常状态。</Text></Card>}
        </>
      ) : null}
    </Page>
  );
}
