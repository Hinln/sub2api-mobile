import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Card, SectionTitle, StateCard } from '@/src/components/ui';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { queryClient } from '@/src/lib/query-client';
import { getAccount, updateAccount } from '@/src/services/admin';
import { theme } from '@/src/theme';

function Field({ label, value, onChangeText, secure, keyboardType = 'default', hint }: { label: string; value: string; onChangeText: (value: string) => void; secure?: boolean; keyboardType?: 'default' | 'url' | 'number-pad' | 'decimal-pad'; hint?: string }) {
  return <View style={{ marginTop: 14 }}><Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '700', marginBottom: 7 }}>{label}</Text><TextInput value={value} onChangeText={onChangeText} secureTextEntry={secure} keyboardType={keyboardType} autoCapitalize="none" autoCorrect={false} placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 13 }} />{hint ? <Text style={{ color: theme.faint, fontSize: 10, lineHeight: 16, marginTop: 6 }}>{hint}</Text> : null}</View>;
}

function toNumber(value: string) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined; }
function toGroupIds(value: string) { return value.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item > 0); }

export default function EditAccountScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const accountId = Number(params.id);
  const account = useQuery({ queryKey: ['account', accountId], queryFn: () => getAccount(accountId), enabled: Number.isFinite(accountId) });
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [concurrency, setConcurrency] = useState('');
  const [priority, setPriority] = useState('');
  const [weight, setWeight] = useState('');
  const [groups, setGroups] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [newApiKey, setNewApiKey] = useState('');

  useEffect(() => {
    const item = account.data;
    if (!item) return;
    setName(item.name || '');
    setNotes(item.notes || '');
    setConcurrency(String(item.concurrency ?? ''));
    setPriority(String(item.priority ?? ''));
    setWeight(String(item.rate_multiplier ?? 1));
    setGroups((item.group_ids ?? item.groups?.map((group) => group.id) ?? []).join(','));
    setBaseUrl(typeof item.credentials?.base_url === 'string' ? item.credentials.base_url : '');
  }, [account.data]);

  const valid = useMemo(() => Boolean(name.trim()) && Number.isFinite(Number(concurrency)) && Number.isFinite(Number(priority)) && Number.isFinite(Number(weight)), [concurrency, name, priority, weight]);
  const mutation = useMutation({
    mutationFn: () => updateAccount(accountId, {
      name: name.trim(),
      notes: notes.trim() || null,
      concurrency: toNumber(concurrency),
      priority: toNumber(priority),
      rate_multiplier: toNumber(weight),
      group_ids: toGroupIds(groups),
      credentials: newApiKey.trim() ? { ...(account.data?.credentials ?? {}), base_url: baseUrl.trim(), api_key: newApiKey.trim() } : undefined,
    }),
    onSuccess: () => {
      setNewApiKey('');
      void queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      router.back();
    },
  });

  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled"><StateCard loading={account.isLoading} error={account.error} onRetry={() => void account.refetch()} />{account.data ? <><SectionTitle title="基础配置" /><Card><Field label="名称" value={name} onChangeText={setName} /><Field label="备注" value={notes} onChangeText={setNotes} /></Card><SectionTitle title="调度配置" /><Card><Field label="最大并发" value={concurrency} onChangeText={setConcurrency} keyboardType="number-pad" /><Field label="优先级" value={priority} onChangeText={setPriority} keyboardType="number-pad" /><Field label="权重 / 计费倍率" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" /><Field label="分组 ID" value={groups} onChangeText={setGroups} hint="多个 ID 使用英文逗号分隔。" /></Card><SectionTitle title="替换凭据" /><Card><Field label="Base URL" value={baseUrl} onChangeText={setBaseUrl} keyboardType="url" hint="仅填写 Base URL 不会提交；必须同时输入新 API Key，避免覆盖后端已有密钥。" /><Field label="新 API Key（可选）" value={newApiKey} onChangeText={setNewApiKey} secure hint="留空时不会修改 credentials。" /></Card>{mutation.error ? <Text style={{ color: theme.danger, fontSize: 12, lineHeight: 18, marginTop: 12 }}>{humanizeApiError(mutation.error)}</Text> : null}<Pressable disabled={!valid || mutation.isPending} onPress={() => Alert.alert('确认保存账号', `${name.trim()}\n修改将立即同步到 Hub。`, [{ text: '取消', style: 'cancel' }, { text: '保存', onPress: () => mutation.mutate() }])} style={{ marginTop: 18, minHeight: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: valid && !mutation.isPending ? theme.primary : theme.muted }}><Text style={{ color: valid && !mutation.isPending ? '#FFFFFF' : theme.faint, fontWeight: '900' }}>{mutation.isPending ? '保存中...' : '确认并保存'}</Text></Pressable></> : null}</ScrollView></KeyboardAvoidingView>;
}
