import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import { AlertTriangle, ClipboardCheck, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';

import { Card, Page, StateCard } from '@/src/components/ui';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { listAlertEvents, listAuditLogs, updateAlertEventStatus } from '@/src/services/admin-extended';
import { theme } from '@/src/theme';

type Mode = 'audit' | 'alerts';

export default function AdminSecurityScreen() {
  const [mode, setMode] = useState<Mode>('audit');
  const client = useQueryClient();
  const audit = useQuery({ queryKey: ['admin-audit-logs'], queryFn: () => listAuditLogs({ page_size: 50 }), enabled: mode === 'audit' });
  const alerts = useQuery({ queryKey: ['admin-alert-events'], queryFn: () => listAlertEvents({ limit: 50 }), enabled: mode === 'alerts' });
  const resolve = useMutation({ mutationFn: (id: number) => updateAlertEventStatus(id, 'resolved'), onSuccess: () => void client.invalidateQueries({ queryKey: ['admin-alert-events'] }) });
  const query = mode === 'audit' ? audit : alerts;
  const items = mode === 'audit' ? audit.data?.items ?? [] : alerts.data ?? [];
  return <Page title="审计与告警" subtitle="真实服务端审计记录、告警状态和处理结果" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <View style={{ flexDirection: 'row', gap: 8 }}><Pressable onPress={() => setMode('audit')} style={{ flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: mode === 'audit' ? theme.primary : theme.cardRaised }}><Text style={{ color: mode === 'audit' ? '#fff' : theme.subtext, fontWeight: '800' }}>审计日志</Text></Pressable><Pressable onPress={() => setMode('alerts')} style={{ flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: mode === 'alerts' ? theme.primary : theme.cardRaised }}><Text style={{ color: mode === 'alerts' ? '#fff' : theme.subtext, fontWeight: '800' }}>告警事件</Text></Pressable></View>
    {resolve.error ? <Text style={{ color: theme.danger }}>{`处理告警失败：${humanizeApiError(resolve.error)}`}</Text> : null}
    <StateCard loading={query.isLoading} error={query.error} empty={!query.isLoading && !query.error && items.length === 0} onRetry={() => void query.refetch()} emptyText={mode === 'audit' ? '暂无审计记录' : '暂无告警事件'} />
    <View style={{ gap: 10 }}>{items.map((item: any) => mode === 'audit' ? <Card key={item.id}><View style={{ flexDirection: 'row', gap: 11 }}><ClipboardCheck color={theme.primary} size={18} /><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>{item.action || item.path || '--'}</Text><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>{item.actor_email || '--'} · {item.method || '--'} · HTTP {item.status_code ?? '--'}</Text><Text style={{ color: theme.faint, fontSize: 11, marginTop: 5 }}>{item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : '--'}</Text></View></View></Card> : <Card key={item.id}><View style={{ flexDirection: 'row', gap: 11 }}><AlertTriangle color={item.status === 'resolved' || item.status === 'manual_resolved' ? theme.success : theme.danger} size={18} /><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>{item.title || item.description || item.severity || '告警事件'}</Text><Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 5 }}>{item.description || item.message || '--'}</Text><Text style={{ color: theme.faint, fontSize: 11, marginTop: 5 }}>{item.status || '--'} · {item.fired_at || item.created_at ? new Date(item.fired_at || item.created_at).toLocaleString('zh-CN') : '--'}</Text></View>{item.status !== 'resolved' && item.status !== 'manual_resolved' ? <Pressable disabled={resolve.isPending} onPress={() => resolve.mutate(item.id)} style={{ padding: 8 }}><ShieldCheck color={theme.success} size={17} /></Pressable> : null}</View></Card>)}</View>
  </Page>;
}
