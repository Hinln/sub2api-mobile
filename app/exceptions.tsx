import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, CircleAlert } from 'lucide-react-native';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Badge, Card, Page, SectionTitle, StateCard } from '@/src/components/ui';
import { listAccounts, listUsageLogs } from '@/src/services/admin';
import { theme } from '@/src/theme';

function summary(code?: number, message?: string | null) {
  if (code === 401 || /token revoked/i.test(message || '')) return 'Token 已失效';
  if (code === 402 || /workspace.*deactivated/i.test(message || '')) return '工作区已停用';
  if (code === 429) return '请求受限';
  if ([500, 502, 503].includes(code || 0)) return '上游服务异常';
  return '请求失败';
}

export default function ExceptionsScreen() {
  const logs = useQuery({ queryKey: ['exception-center-logs'], queryFn: () => listUsageLogs({ status: 'error', page_size: 30 }), staleTime: 30_000 });
  const accounts = useQuery({ queryKey: ['exception-center-accounts'], queryFn: () => listAccounts('', { page_size: 50 }), staleTime: 30_000 });
  const failed = logs.data?.items ?? [];
  const accountProblems = (accounts.data?.items ?? []).filter((account) => account.status === 'error' || Boolean(account.error_message));
  const refresh = () => { void logs.refetch(); void accounts.refetch(); };

  return (
    <Page title={'异常中心'} subtitle={`基于最近 ${failed.length} 条失败日志与当前页账号列表，不代表全站完整审计`} refreshing={logs.isRefetching || accounts.isRefetching} onRefresh={refresh}>
      <StateCard loading={logs.isLoading || accounts.isLoading} error={logs.error || accounts.error} onRetry={refresh} />
      {!logs.isLoading && !accounts.isLoading && !(logs.error || accounts.error) ? <>
        <View style={{ flexDirection: 'row', gap: 10 }}><Card style={{ flex: 1, backgroundColor: theme.dangerSoft }}><Text style={{ color: theme.danger, fontSize: 11 }}>{'最近失败'}</Text><Text style={{ color: theme.danger, fontSize: 25, fontWeight: '900', marginTop: 6 }}>{logs.data?.total ?? failed.length}</Text></Card><Card style={{ flex: 1 }}><Text style={{ color: theme.subtext, fontSize: 11 }}>{'异常账号（当前页）'}</Text><Text style={{ color: theme.text, fontSize: 25, fontWeight: '900', marginTop: 6 }}>{accountProblems.length}</Text></Card></View>
        <SectionTitle title={'失败请求'} />
        {failed.length ? <View style={{ gap: 9 }}>{failed.map((entry) => <Card key={entry.id}><View style={{ flexDirection: 'row', gap: 10 }}><CircleAlert color={theme.danger} size={18} /><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>{summary(entry.status_code, entry.error_message)}</Text><Text numberOfLines={2} style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 5 }}>{entry.error_message || `HTTP ${entry.status_code ?? '--'}`}</Text><Text style={{ color: theme.faint, fontSize: 11, marginTop: 6 }}>{`HTTP ${entry.status_code ?? '--'} · Request ID ${entry.request_id || '--'}`}</Text></View><Badge label={String(entry.status_code ?? 'ERR')} tone="danger" /></View></Card>)}</View> : <Card><Text style={{ color: theme.subtext, textAlign: 'center' }}>当前查询范围内没有失败日志</Text></Card>}
        <SectionTitle title={'账号异常'} action={<Pressable onPress={() => router.push('/accounts')}><Text style={{ color: theme.primary, fontWeight: '800', fontSize: 12 }}>查看账号</Text></Pressable>} />
        {accountProblems.length ? <View style={{ gap: 9 }}>{accountProblems.map((account) => <Pressable key={account.id} onPress={() => router.push(`/accounts/${account.id}`)}><Card><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><AlertTriangle color={theme.warning} size={18} /><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>{account.name}</Text><Text numberOfLines={2} style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>{account.error_message || '后端标记为异常'}</Text></View><ChevronRight color={theme.faint} size={18} /></View></Card></Pressable>)}</View> : <Card><Text style={{ color: theme.subtext, textAlign: 'center' }}>当前页没有异常账号</Text></Card>}
      </> : null}
    </Page>
  );
}
