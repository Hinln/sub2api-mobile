import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { KeyRound, Wallet, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Badge, Card, Metric, SectionTitle, StateCard } from '@/src/components/ui';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { formatTokenValue } from '@/src/lib/formatters';
import { queryClient } from '@/src/lib/query-client';
import { getUser, getUserUsage, listUserApiKeys, updateUserBalance, updateUserStatus } from '@/src/services/admin';
import { theme } from '@/src/theme';
import type { BalanceOperation } from '@/src/types/admin';

export default function UserDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const userId = Number(params.id);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [operation, setOperation] = useState<BalanceOperation>('set');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const user = useQuery({ queryKey: ['user', userId], queryFn: () => getUser(userId), enabled: Number.isFinite(userId) });
  const usage = useQuery({ queryKey: ['user-usage', userId], queryFn: () => getUserUsage(userId, 'month'), enabled: Number.isFinite(userId) });
  const keys = useQuery({ queryKey: ['user-api-keys', userId], queryFn: () => listUserApiKeys(userId), enabled: Number.isFinite(userId) });
  const refresh = () => { void user.refetch(); void usage.refetch(); void keys.refetch(); };
  const statusMutation = useMutation({ mutationFn: (status: 'active' | 'disabled') => updateUserStatus(userId, status), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['user', userId] }); void queryClient.invalidateQueries({ queryKey: ['users'] }); } });
  const balanceMutation = useMutation({ mutationFn: () => updateUserBalance(userId, { balance: Number(amount), operation, notes: notes.trim() || undefined }), onSuccess: () => { setBalanceOpen(false); setAmount(''); setNotes(''); void queryClient.invalidateQueries({ queryKey: ['user', userId] }); } });
  const item = user.data;
  const disabled = ['disabled', 'inactive'].includes(item?.status || '');

  function confirmStatus() {
    if (!item) return;
    const next = disabled ? 'active' : 'disabled';
    Alert.alert(disabled ? '\u542f\u7528\u7528\u6237' : '\u7981\u7528\u7528\u6237', `${item.email}\n${disabled ? '\u5c06\u6062\u590d\u8be5\u7528\u6237\u7684 API \u8bbf\u95ee\u3002' : '\u8be5\u7528\u6237\u7684 API \u8bf7\u6c42\u5c06\u88ab\u62d2\u7edd\u3002'}`, [{ text: '\u53d6\u6d88', style: 'cancel' }, { text: '\u786e\u8ba4', style: disabled ? 'default' : 'destructive', onPress: () => statusMutation.mutate(next) }]);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.page }} contentContainerStyle={{ padding: 16, paddingBottom: 44 }} refreshControl={undefined}>
      <StateCard loading={user.isLoading} error={user.error} onRetry={refresh} />
      {item ? <>
        <Card><View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 21, fontWeight: '900' }}>{item.username || item.email}</Text><Text selectable style={{ color: theme.subtext, fontSize: 13, marginTop: 6 }}>{item.email}</Text><Text style={{ color: theme.faint, fontSize: 11, marginTop: 9 }}>{`ID ${item.id} \u00b7 ${item.role || 'user'} \u00b7 ${item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : '--'}`}</Text></View><Badge label={disabled ? '\u5df2\u7981\u7528' : '\u6b63\u5e38'} tone={disabled ? 'danger' : 'success'} /></View>{item.notes ? <Text style={{ color: theme.subtext, lineHeight: 19, marginTop: 14 }}>{item.notes}</Text> : null}</Card>

        <SectionTitle title={'\u672c\u6708\u4f7f\u7528'} />
        <View style={{ flexDirection: 'row', gap: 9 }}><Metric label={'\u8bf7\u6c42'} value={String(usage.data?.total_requests ?? usage.data?.requests ?? '--')} /><Metric label="Token" value={formatTokenValue(Number(usage.data?.total_tokens ?? usage.data?.tokens ?? 0))} /><Metric label={'\u8d39\u7528'} value={`$${Number(usage.data?.total_cost ?? usage.data?.cost ?? 0).toFixed(2)}`} tone="warning" /></View>

        <SectionTitle title={'\u8d26\u52a1\u4e0e\u72b6\u6001'} />
        <Card><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Wallet color={theme.primary} size={20} /><View style={{ flex: 1 }}><Text style={{ color: theme.subtext, fontSize: 11 }}>{'\u5f53\u524d\u4f59\u989d'}</Text><Text style={{ color: theme.text, fontSize: 22, fontWeight: '900', marginTop: 4 }}>${Number(item.balance ?? 0).toFixed(2)}</Text></View><Pressable onPress={() => setBalanceOpen(true)} style={{ backgroundColor: theme.primarySoft, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10 }}><Text style={{ color: theme.primary, fontWeight: '800', fontSize: 12 }}>{'\u8c03\u6574'}</Text></Pressable></View><View style={{ height: 1, backgroundColor: theme.border, marginVertical: 15 }} /><Pressable disabled={statusMutation.isPending} onPress={confirmStatus} style={{ backgroundColor: disabled ? theme.successSoft : theme.dangerSoft, borderRadius: 13, paddingVertical: 12, alignItems: 'center' }}><Text style={{ color: disabled ? theme.success : theme.danger, fontWeight: '900' }}>{disabled ? '\u542f\u7528\u7528\u6237' : '\u7981\u7528\u7528\u6237'}</Text></Pressable>{statusMutation.error ? <Text style={{ color: theme.danger, fontSize: 12, marginTop: 9 }}>{humanizeApiError(statusMutation.error)}</Text> : null}</Card>

        <SectionTitle title={`API Key (${keys.data?.total ?? 0})`} />
        <StateCard loading={keys.isLoading} error={keys.error} empty={!keys.isLoading && !keys.error && (keys.data?.items.length ?? 0) === 0} onRetry={() => void keys.refetch()} />
        <View style={{ gap: 9 }}>{keys.data?.items.map((key) => <Card key={key.id}><View style={{ flexDirection: 'row', gap: 11 }}><KeyRound color={theme.primary} size={18} /><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>{key.name || `Key #${key.id}`}</Text><Text style={{ color: theme.subtext, fontSize: 11, marginTop: 5 }}>{key.key ? `${key.key.slice(0, 6)}...${key.key.slice(-4)}` : '\u5bc6\u94a5\u5185\u5bb9\u672a\u8fd4\u56de'}</Text><Text style={{ color: theme.faint, fontSize: 11, marginTop: 7 }}>{`\u5df2\u7528 ${key.quota_used ?? 0} / \u914d\u989d ${key.quota ?? 0}`}</Text></View><Badge label={key.status || '--'} tone={key.status === 'active' ? 'success' : 'muted'} /></View></Card>)}</View>
      </> : null}

      <Modal transparent visible={balanceOpen} animationType="slide" onRequestClose={() => setBalanceOpen(false)}><KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000099' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={{ backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ color: theme.text, fontSize: 20, fontWeight: '900', flex: 1 }}>{'\u8c03\u6574\u4f59\u989d'}</Text><Pressable onPress={() => setBalanceOpen(false)}><X color={theme.subtext} size={21} /></Pressable></View><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 6 }}>{item?.email}</Text><View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>{([['set', '\u8bbe\u7f6e\u6700\u7ec8\u4f59\u989d'], ['add', '\u589e\u52a0'], ['subtract', '\u6263\u51cf']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setOperation(value)} style={{ flex: 1, borderRadius: 12, backgroundColor: operation === value ? theme.primary : theme.cardRaised, paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: operation === value ? '#FFFFFF' : theme.subtext, fontSize: 11, fontWeight: '800' }}>{label}</Text></Pressable>)}</View><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={'\u91d1\u989d'} placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, padding: 14, marginTop: 14 }} /><TextInput value={notes} onChangeText={setNotes} placeholder={'\u5907\u6ce8\uff08\u53ef\u9009\uff09'} placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, padding: 14, marginTop: 10 }} />{balanceMutation.error ? <Text style={{ color: theme.danger, fontSize: 12, marginTop: 10 }}>{humanizeApiError(balanceMutation.error)}</Text> : null}<Pressable disabled={!Number.isFinite(Number(amount)) || !amount || balanceMutation.isPending} onPress={() => Alert.alert('\u786e\u8ba4\u8c03\u6574\u4f59\u989d', `\u5bf9 ${item?.email} \u6267\u884c\u300c${operation}\u300d\uff0c\u91d1\u989d ${amount}\u3002`, [{ text: '\u53d6\u6d88', style: 'cancel' }, { text: '\u786e\u8ba4', onPress: () => balanceMutation.mutate() }])} style={{ marginTop: 16, borderRadius: 15, backgroundColor: theme.primary, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{balanceMutation.isPending ? '\u63d0\u4ea4\u4e2d...' : '\u4e8c\u6b21\u786e\u8ba4\u5e76\u63d0\u4ea4'}</Text></Pressable></View></KeyboardAvoidingView></Modal>
    </ScrollView>
  );
}
