import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Check, ChevronDown, ChevronUp, RefreshCw, X } from 'lucide-react-native';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { Badge, Card, Metric, SectionTitle, StateCard } from '@/src/components/ui';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { buildRedactedAccountCredentialsForMapping } from '@/src/lib/account-credentials';
import { newIdempotencyKey } from '@/src/lib/idempotency';
import { queryClient } from '@/src/lib/query-client';
import { clearAccountError, getAccount, getAccountModels, getAccountTodayStats, listAccountProxies, listGroups, recoverAccountState, refreshAccount, setAccountSchedulable, syncAccountModels, testAccount, updateAccount, updateAccountModelMapping } from '@/src/services/admin';
import { theme } from '@/src/theme';
import type { AdminAccount, AdminAccountModel, AdminAccountModelsResponse, AdminProxy, UpdateAccountRequest } from '@/src/types/admin';

type AccountForm = {
  name: string;
  notes: string;
  concurrency: string;
  priority: string;
  rateMultiplier: string;
  loadFactor: string;
  proxyId: string;
  groupIds: number[];
  status: string;
  expiresAt: string;
  autoPauseOnExpired: boolean;
};

function numberInput(value: number | null | undefined, fallback = '') {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : fallback;
}

function formFromAccount(item: AdminAccount) {
  const expiry = typeof item.expires_at === 'number' && item.expires_at > 0
    ? new Date(item.expires_at * 1000).toISOString()
    : '';
  return {
    name: item.name || '',
    notes: item.notes || '',
    concurrency: numberInput(item.concurrency),
    priority: numberInput(item.priority),
    rateMultiplier: numberInput(item.rate_multiplier, '1'),
    loadFactor: numberInput(item.load_factor),
    proxyId: typeof item.proxy_id === 'number' ? String(item.proxy_id) : '',
    groupIds: item.group_ids ?? item.groups?.map((group) => group.id) ?? [],
    status: item.status || 'active',
    expiresAt: expiry,
    autoPauseOnExpired: item.auto_pause_on_expired ?? true,
  } satisfies AccountForm;
}

function modelsFromResponse(value: AdminAccountModelsResponse | undefined): AdminAccountModel[] {
  const raw = Array.isArray(value) ? value : value?.models ?? value?.items ?? [];
  const metadata = !Array.isArray(value) && value?.metadata ? value.metadata : undefined;
  return raw.map((model) => {
    if (typeof model !== 'string') return model;
    return { model, id: model, display_name: metadata?.[model]?.display_name ?? model, ...metadata?.[model] };
  });
}

function proxiesFromResponse(value: AdminProxy[] | { items?: AdminProxy[]; proxies?: AdminProxy[] } | { items?: AdminProxy[]; total: number; page: number; page_size: number; pages: number } | undefined): AdminProxy[] {
  if (Array.isArray(value)) return value;
  const candidate = value as { items?: AdminProxy[]; proxies?: AdminProxy[] } | undefined;
  return candidate?.items ?? candidate?.proxies ?? [];
}

export default function AccountDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const accountId = Number(params.id);
  const account = useQuery({ queryKey: ['account', accountId], queryFn: () => getAccount(accountId), enabled: Number.isFinite(accountId) });
  const today = useQuery({ queryKey: ['account-today', accountId], queryFn: () => getAccountTodayStats(accountId), enabled: Number.isFinite(accountId) });
  const [editorOpen, setEditorOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [form, setForm] = useState<AccountForm>();
  const [syncedModels, setSyncedModels] = useState<AdminAccountModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [syncWarnings, setSyncWarnings] = useState<string[]>([]);
  const [modelSaveNotice, setModelSaveNotice] = useState<string>();
  const actionKeys = useRef<Record<string, string>>({});
  const saveKey = useRef('');
  const syncKey = useRef('');
  const modelSaveKey = useRef('');
  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: ['account', accountId] }); void queryClient.invalidateQueries({ queryKey: ['accounts'] }); };
  const groups = useQuery({ queryKey: ['groups', 'account-editor'], queryFn: () => listGroups('', { page_size: 100 }), enabled: editorOpen, staleTime: 60_000 });
  const proxies = useQuery({ queryKey: ['account-proxies'], queryFn: listAccountProxies, enabled: editorOpen, staleTime: 60_000 });
  const models = useQuery({ queryKey: ['account-models', accountId], queryFn: () => getAccountModels(accountId), enabled: Number.isFinite(accountId), staleTime: 60_000 });
  const save = useMutation({
    mutationFn: (body: UpdateAccountRequest) => updateAccount(accountId, body, saveKey.current),
    onSuccess: () => { saveKey.current = ''; setEditorOpen(false); setForm(undefined); invalidate(); void models.refetch(); Alert.alert('已保存', '账号设置已由服务端更新。'); },
  });
  const syncModels = useMutation({
    mutationFn: () => syncAccountModels(accountId, syncKey.current),
    onSuccess: (result) => {
      syncKey.current = '';
      setSyncedModels(modelsFromResponse(result));
      setSyncWarnings(!Array.isArray(result) && result?.warnings ? result.warnings.map((warning) => warning.message || warning.code || '上游返回未命名警告') : []);
    },
  });
  const saveModels = useMutation({
    mutationFn: () => {
      const credentials = buildRedactedAccountCredentialsForMapping(item?.credentials, selectedModels);
      if (!credentials) throw new Error('服务端未返回可安全合并的账号配置，请刷新账号后重试');
      return updateAccountModelMapping(accountId, credentials, modelSaveKey.current);
    },
    onSuccess: (updated) => {
      modelSaveKey.current = '';
      setModelSaveNotice('已保存模型支持范围，服务端配置已更新');
      queryClient.setQueryData(['account', accountId], updated);
      void queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
  const action = useMutation({ mutationFn: async (input: { name: 'test' | 'refresh' | 'recover' | 'clear' | 'toggle'; idempotencyKey: string }) => {
    if (input.name === 'test') return testAccount(accountId, input.idempotencyKey);
    if (input.name === 'refresh') return refreshAccount(accountId, input.idempotencyKey);
    if (input.name === 'recover') return recoverAccountState(accountId, input.idempotencyKey);
    if (input.name === 'clear') return clearAccountError(accountId, input.idempotencyKey);
    return setAccountSchedulable(accountId, account.data?.schedulable === false, input.idempotencyKey);
  }, onSuccess: (_result, input) => { delete actionKeys.current[input.name]; invalidate(); } });
  const item = account.data;
  const isError = Boolean(item?.error_message || item?.status === 'error');
  const paused = item?.schedulable === false;
  const modelCatalog = syncedModels.length ? syncedModels : modelsFromResponse(models.data);

  useEffect(() => {
    if (item && !editorOpen) {
      setForm(formFromAccount(item));
      const mapping = item.credentials?.model_mapping;
      setSelectedModels(mapping && typeof mapping === 'object' && !Array.isArray(mapping) ? Object.keys(mapping as Record<string, unknown>) : []);
    }
  }, [item, editorOpen]);

  function openEditor() {
    if (!item) return;
    setForm(formFromAccount(item));
    setAdvancedOpen(false);
    setEditorOpen(true);
  }

  function toggleGroup(groupId: number) {
    setForm((current) => current ? { ...current, groupIds: current.groupIds.includes(groupId) ? current.groupIds.filter((id) => id !== groupId) : [...current.groupIds, groupId] } : current);
  }

  function submitEditor() {
    if (!form || !form.name.trim()) {
      Alert.alert('无法保存', '账号名称不能为空。');
      return;
    }
    const numeric = (raw: string, label: string, allowEmpty = false) => {
      if (allowEmpty && !raw.trim()) return undefined;
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error(`${label}必须是数字`);
      return value;
    };
    const integer = (raw: string, label: string, allowEmpty = false) => {
      const value = numeric(raw, label, allowEmpty);
      if (value !== undefined && !Number.isInteger(value)) throw new Error(`${label}必须是整数`);
      return value;
    };
    let body: UpdateAccountRequest;
    try {
      body = {
        name: form.name.trim(),
        notes: form.notes.trim() || null,
        concurrency: integer(form.concurrency, '并发数', true),
        priority: integer(form.priority, '优先级', true),
        rate_multiplier: numeric(form.rateMultiplier, '倍率', true),
        load_factor: integer(form.loadFactor, '负载因子', true),
        // The official endpoint uses 0 to clear an existing proxy binding.
        proxy_id: form.proxyId ? Number(form.proxyId) : 0,
        group_ids: [...form.groupIds],
        status: form.status,
        expires_at: form.expiresAt.trim() ? (() => {
          const parsed = Date.parse(form.expiresAt.trim());
          if (!Number.isFinite(parsed)) throw new Error('到期时间必须是有效的 ISO 8601 时间');
          return Math.floor(parsed / 1000);
        })() : 0,
        auto_pause_on_expired: form.autoPauseOnExpired,
      };
    } catch (error) {
      Alert.alert('无法保存', error instanceof Error ? error.message : '请检查输入');
      return;
    }
    Alert.alert('确认保存账号设置', `${item?.name}\n将更新名称、调度参数、分组和代理绑定。已隐藏的凭据不会被读取或覆盖。`, [
      { text: '取消', style: 'cancel' },
      { text: '确认保存', onPress: () => { if (!saveKey.current) saveKey.current = newIdempotencyKey(`admin-account-${accountId}-update`); save.mutate(body); } },
    ]);
  }

  function run(name: 'test' | 'refresh' | 'recover' | 'clear' | 'toggle', title: string, description: string, destructive = false) {
    Alert.alert(title, `${item?.name}\n${description}`, [{ text: '\u53d6\u6d88', style: 'cancel' }, { text: '\u786e\u8ba4', style: destructive ? 'destructive' : 'default', onPress: () => { if (!actionKeys.current[name]) actionKeys.current[name] = newIdempotencyKey(`admin-account-${accountId}-${name}`); action.mutate({ name, idempotencyKey: actionKeys.current[name] }); } }]);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.page }} contentContainerStyle={{ padding: 16, paddingBottom: 44 }}>
      <StateCard loading={account.isLoading} error={account.error} onRetry={() => void account.refetch()} />
      {item ? <>
        <Card><View style={{ flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 21, fontWeight: '900' }}>{item.name}</Text><Text style={{ color: theme.subtext, marginTop: 6 }}>{item.platform} {'\u00b7'} {item.type}</Text><Text style={{ color: theme.faint, fontSize: 11, marginTop: 9 }}>ID {item.id} {'\u00b7'} {item.updated_at ? new Date(item.updated_at).toLocaleString('zh-CN') : '--'}</Text></View><Badge label={isError ? '\u5f02\u5e38' : paused ? '\u5df2\u6682\u505c' : '\u6b63\u5e38'} tone={isError ? 'danger' : paused ? 'muted' : 'success'} /></View>{item.error_message ? <View style={{ backgroundColor: theme.dangerSoft, borderRadius: 13, padding: 11, marginTop: 14 }}><Text selectable style={{ color: theme.danger, fontSize: 12, lineHeight: 18 }}>{item.error_message}</Text></View> : null}<Pressable accessibilityRole="button" onPress={openEditor} style={{ marginTop: 14, borderRadius: 13, backgroundColor: theme.primarySoft, paddingVertical: 12, alignItems: 'center' }}><Text style={{ color: theme.primary, fontWeight: '900' }}>编辑账号设置</Text></Pressable></Card>

        <SectionTitle title={'\u4eca\u65e5\u7528\u91cf'} />
        <View style={{ flexDirection: 'row', gap: 9 }}><Metric label={'\u8bf7\u6c42'} value={String(today.data?.requests ?? '--')} /><Metric label="Token" value={String(today.data?.tokens ?? '--')} /><Metric label={'\u6210\u672c'} value={typeof today.data?.cost === 'number' ? `$${today.data.cost.toFixed(2)}` : '--'} tone="warning" /></View>

        <SectionTitle title={'\u8c03\u5ea6\u4fe1\u606f'} />
        <Card>{[
          ['\u5f53\u524d\u5e76\u53d1', `${typeof item.current_concurrency === 'number' ? item.current_concurrency : '--'} / ${typeof item.concurrency === 'number' ? item.concurrency : '--'}`], ['\u4f18\u5148\u7ea7', String(item.priority ?? '--')], ['\u6743\u91cd / \u500d\u7387', typeof item.rate_multiplier === 'number' ? String(item.rate_multiplier) : '--'], ['\u6700\u8fd1\u4f7f\u7528', item.last_used_at ? new Date(item.last_used_at).toLocaleString('zh-CN') : '--'], ['\u51b7\u5374\u622a\u6b62', item.rate_limit_reset_at ? new Date(item.rate_limit_reset_at).toLocaleString('zh-CN') : '--'], ['\u6240\u5c5e\u5206\u7ec4', item.groups?.map((group) => group.name).join(', ') || '--'],
        ].map(([label, value]) => <View key={label} style={{ flexDirection: 'row', gap: 12, paddingVertical: 9 }}><Text style={{ width: 100, color: theme.faint, fontSize: 12 }}>{label}</Text><Text selectable style={{ flex: 1, color: theme.text, fontSize: 12, textAlign: 'right' }}>{value}</Text></View>)}</Card>

        <SectionTitle title="支持的模型" action={<Pressable accessibilityRole="button" disabled={syncModels.isPending} onPress={() => { setSyncWarnings([]); setModelSaveNotice(undefined); if (!syncKey.current) syncKey.current = newIdempotencyKey(`admin-account-${accountId}-models-sync`); syncModels.mutate(); }} hitSlop={8}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><RefreshCw color={theme.primary} size={14} /><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '900' }}>{syncModels.isPending ? '同步中…' : '从上游同步'}</Text></View></Pressable>} />
        <Card>
          {models.isLoading ? <Text style={{ color: theme.subtext, fontSize: 12 }}>正在读取上游模型目录…</Text> : null}
          {!models.isLoading && !models.error && !modelCatalog.length ? <Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 18 }}>暂无上游模型记录。点击“从上游同步”请求官方接口；同步失败不会伪造模型。</Text> : null}
          {modelCatalog.length ? <>
            <Text style={{ color: theme.subtext, fontSize: 11, lineHeight: 17, marginBottom: 9 }}>选择后保存同名模型映射；只有点击保存才会修改服务端配置。</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{modelCatalog.map((model, index) => { const modelId = String(model.model || model.id || model.name || index); const label = model.display_name || model.name || model.model || modelId; const selected = selectedModels.includes(modelId); return <Pressable key={modelId} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => { setModelSaveNotice(undefined); setSelectedModels((current) => current.includes(modelId) ? current.filter((value) => value !== modelId) : [...current, modelId]); }} style={{ borderRadius: 11, backgroundColor: selected ? theme.primary : model.enabled === false ? theme.muted : theme.successSoft, borderWidth: 1, borderColor: selected ? theme.primary : theme.border, paddingHorizontal: 10, paddingVertical: 8 }}><Text style={{ color: selected ? '#FFFFFF' : model.enabled === false ? theme.subtext : theme.success, fontSize: 11, fontWeight: '800' }}>{label}</Text></Pressable>; })}</View>
            <Pressable accessibilityRole="button" disabled={saveModels.isPending} onPress={() => Alert.alert('确认保存模型支持范围', `将保存 ${selectedModels.length} 个同名模型映射。未选模型不会被支持；不会读取或回传 API Key。`, [{ text: '取消', style: 'cancel' }, { text: '确认保存', onPress: () => { if (!modelSaveKey.current) modelSaveKey.current = newIdempotencyKey(`admin-account-${accountId}-models-save`); saveModels.mutate(); } }])} style={{ marginTop: 14, borderRadius: 13, backgroundColor: saveModels.isPending ? theme.muted : theme.primary, paddingVertical: 12, alignItems: 'center' }}><Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{saveModels.isPending ? '保存中…' : '保存支持模型'}</Text></Pressable>
          </> : null}
          {syncWarnings.length ? <View style={{ marginTop: 11, borderRadius: 12, backgroundColor: theme.warningSoft, padding: 10 }}><Text style={{ color: theme.warning, fontSize: 11, lineHeight: 17 }}>{`上游警告：${syncWarnings.join('；')}`}</Text></View> : null}
          {modelSaveNotice ? <Text style={{ color: theme.success, fontSize: 11, lineHeight: 17, marginTop: 10 }}>{modelSaveNotice}</Text> : null}
          {models.error ? <Text style={{ color: theme.warning, fontSize: 11, lineHeight: 17, marginTop: 10 }}>模型目录读取失败：{humanizeApiError(models.error)}</Text> : null}
          {syncModels.error ? <Text style={{ color: theme.danger, fontSize: 11, lineHeight: 17, marginTop: 10 }}>同步失败：{humanizeApiError(syncModels.error)}</Text> : null}
          {saveModels.error ? <Text style={{ color: theme.danger, fontSize: 11, lineHeight: 17, marginTop: 10 }}>模型保存失败：{humanizeApiError(saveModels.error)}</Text> : null}
        </Card>

        <SectionTitle title={'\u5b89\u5168\u64cd\u4f5c'} />
        <Card><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
          <Pressable disabled={action.isPending} onPress={() => run('test', '\u6d4b\u8bd5\u8d26\u53f7', '\u540e\u7aef\u5c06\u6267\u884c\u73b0\u6709\u7684\u8d26\u53f7\u8fde\u901a\u6027\u6d4b\u8bd5\u3002')} style={{ borderRadius: 13, backgroundColor: theme.primarySoft, paddingHorizontal: 14, paddingVertical: 11 }}><Text style={{ color: theme.primary, fontWeight: '800' }}>{'\u6d4b\u8bd5'}</Text></Pressable>
          <Pressable disabled={action.isPending} onPress={() => run('refresh', '\u5237\u65b0\u8d26\u53f7', '\u5237\u65b0\u540e\u7aef\u8d26\u53f7\u72b6\u6001\u548c\u914d\u989d\u3002')} style={{ borderRadius: 13, backgroundColor: theme.primarySoft, paddingHorizontal: 14, paddingVertical: 11 }}><Text style={{ color: theme.primary, fontWeight: '800' }}>{'\u5237\u65b0\u72b6\u6001'}</Text></Pressable>
          {isError ? <Pressable disabled={action.isPending} onPress={() => run('clear', '\u6e05\u9664\u9519\u8bef', '\u4ec5\u6e05\u9664\u5df2\u8bb0\u5f55\u7684\u9519\u8bef\u72b6\u6001\uff0c\u4e0d\u4f1a\u4fee\u6539\u51ed\u636e\u3002')} style={{ borderRadius: 13, backgroundColor: theme.warningSoft, paddingHorizontal: 14, paddingVertical: 11 }}><Text style={{ color: theme.warning, fontWeight: '800' }}>{'\u6e05\u9664\u9519\u8bef'}</Text></Pressable> : null}
          {isError ? <Pressable disabled={action.isPending} onPress={() => run('recover', '\u6062\u590d\u8d26\u53f7\u72b6\u6001', '\u8bf7\u786e\u8ba4\u5df2\u6392\u9664\u51ed\u636e\u6216\u4e0a\u6e38\u95ee\u9898\u3002')} style={{ borderRadius: 13, backgroundColor: theme.warningSoft, paddingHorizontal: 14, paddingVertical: 11 }}><Text style={{ color: theme.warning, fontWeight: '800' }}>{'\u6062\u590d\u72b6\u6001'}</Text></Pressable> : null}
          <Pressable disabled={action.isPending} onPress={() => run('toggle', paused ? '\u6062\u590d\u8c03\u5ea6' : '\u6682\u505c\u8c03\u5ea6', paused ? '\u8d26\u53f7\u5c06\u91cd\u65b0\u8fdb\u5165\u53ef\u8c03\u5ea6\u6c60\u3002' : '\u65b0\u8bf7\u6c42\u4e0d\u518d\u9009\u62e9\u6b64\u8d26\u53f7\u3002', !paused)} style={{ borderRadius: 13, backgroundColor: paused ? theme.successSoft : theme.dangerSoft, paddingHorizontal: 14, paddingVertical: 11 }}><Text style={{ color: paused ? theme.success : theme.danger, fontWeight: '800' }}>{paused ? '\u6062\u590d\u8c03\u5ea6' : '\u6682\u505c\u8c03\u5ea6'}</Text></Pressable>
        </View>{action.isPending ? <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 12 }}>{'\u6b63\u5728\u5904\u7406...'}</Text> : null}{action.error ? <Text style={{ color: theme.danger, fontSize: 12, marginTop: 12 }}>{humanizeApiError(action.error)}</Text> : null}</Card>
      </> : null}
      <Modal transparent visible={editorOpen} animationType="slide" onRequestClose={() => { if (!save.isPending) setEditorOpen(false); }}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ maxHeight: '91%', backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 }}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 20, fontWeight: '900' }}>编辑账号设置</Text><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>仅提交官方允许的非敏感字段</Text></View><Pressable accessibilityLabel="close-account-editor" disabled={save.isPending} onPress={() => setEditorOpen(false)} hitSlop={10}><X color={theme.subtext} size={22} /></Pressable></View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 6, paddingBottom: 32 }}>
              {form ? <>
                <Text style={{ color: theme.subtext, fontSize: 11, fontWeight: '800', marginBottom: 6 }}>基本信息</Text>
                <TextInput accessibilityLabel="account-name" value={form.name} onChangeText={(name) => setForm((current) => current ? { ...current, name } : current)} placeholder="账号名称" placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, padding: 14 }} />
                <TextInput accessibilityLabel="account-notes" value={form.notes} onChangeText={(notes) => setForm((current) => current ? { ...current, notes } : current)} placeholder="备注（可选）" placeholderTextColor={theme.faint} multiline style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, padding: 14, marginTop: 10, minHeight: 70, textAlignVertical: 'top' }} />

                <Text style={{ color: theme.subtext, fontSize: 11, fontWeight: '800', marginTop: 18, marginBottom: 6 }}>调度参数</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {([['concurrency', '并发上限'], ['priority', '优先级'], ['rateMultiplier', '倍率']] as const).map(([field, label]) => <View key={field} style={{ flex: 1 }}><Text style={{ color: theme.faint, fontSize: 10, marginBottom: 5 }}>{label}</Text><TextInput accessibilityLabel={`account-${field}`} value={form[field]} onChangeText={(value) => setForm((current) => current ? { ...current, [field]: value } : current)} keyboardType="decimal-pad" placeholder="--" placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 11 }} /></View>)}
                </View>
                <Text style={{ color: theme.faint, fontSize: 11, marginTop: 8 }}>状态</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>{[['active', '正常'], ['inactive', '停用']].map(([value, label]) => <Pressable key={value} onPress={() => setForm((current) => current ? { ...current, status: value } : current)} style={{ flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: form.status === value ? theme.primary : theme.cardRaised }}><Text style={{ color: form.status === value ? '#FFFFFF' : theme.subtext, fontSize: 12, fontWeight: '800' }}>{label}</Text></Pressable>)}</View>

                <Text style={{ color: theme.subtext, fontSize: 11, fontWeight: '800', marginTop: 18, marginBottom: 6 }}>绑定分组</Text>
                {groups.error ? <Text style={{ color: theme.warning, fontSize: 11, marginBottom: 6 }}>分组读取失败：{humanizeApiError(groups.error)}</Text> : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(groups.data?.items ?? []).map((group) => { const selected = form.groupIds.includes(group.id); return <Pressable key={group.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => toggleGroup(group.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, backgroundColor: selected ? theme.primary : theme.cardRaised, paddingHorizontal: 11, paddingVertical: 8 }}><Text style={{ color: selected ? '#FFFFFF' : theme.subtext, fontSize: 11, fontWeight: '800' }}>{group.name}</Text>{selected ? <Check color="#FFFFFF" size={13} /> : null}</Pressable>; })}</View>
                {!groups.isLoading && !groups.error && !(groups.data?.items.length) ? <Text style={{ color: theme.faint, fontSize: 11 }}>当前没有可绑定分组；提交空数组会清除现有绑定。</Text> : null}

                <Text style={{ color: theme.subtext, fontSize: 11, fontWeight: '800', marginTop: 18, marginBottom: 6 }}>代理 IP</Text>
                {proxies.error ? <Text style={{ color: theme.warning, fontSize: 11, marginBottom: 6 }}>代理列表读取失败：{humanizeApiError(proxies.error)}</Text> : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}><Pressable onPress={() => setForm((current) => current ? { ...current, proxyId: '' } : current)} style={{ borderRadius: 999, backgroundColor: !form.proxyId ? theme.primary : theme.cardRaised, paddingHorizontal: 12, paddingVertical: 8 }}><Text style={{ color: !form.proxyId ? '#FFFFFF' : theme.subtext, fontSize: 11, fontWeight: '800' }}>不使用代理</Text></Pressable>{proxiesFromResponse(proxies.data).map((proxy) => { const selected = form.proxyId === String(proxy.id); return <Pressable key={proxy.id} onPress={() => setForm((current) => current ? { ...current, proxyId: String(proxy.id) } : current)} style={{ borderRadius: 999, backgroundColor: selected ? theme.primary : theme.cardRaised, paddingHorizontal: 12, paddingVertical: 8 }}><Text numberOfLines={1} style={{ maxWidth: 150, color: selected ? '#FFFFFF' : theme.subtext, fontSize: 11, fontWeight: '800' }}>{proxy.name || proxy.host || `代理 #${proxy.id}`}</Text></Pressable>; })}</ScrollView>

                <Pressable accessibilityRole="button" onPress={() => setAdvancedOpen((value) => !value)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingVertical: 8 }}><Text style={{ color: theme.text, flex: 1, fontSize: 13, fontWeight: '900' }}>高级调度与到期</Text>{advancedOpen ? <ChevronUp color={theme.subtext} size={18} /> : <ChevronDown color={theme.subtext} size={18} />}</Pressable>
                {advancedOpen ? <View style={{ borderRadius: 15, backgroundColor: theme.cardRaised, padding: 13 }}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: form.autoPauseOnExpired }} onPress={() => setForm((current) => current ? { ...current, autoPauseOnExpired: !current.autoPauseOnExpired } : current)} style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: form.autoPauseOnExpired ? theme.primary : theme.border, backgroundColor: form.autoPauseOnExpired ? theme.primary : theme.card, alignItems: 'center', justifyContent: 'center' }}>{form.autoPauseOnExpired ? <Check color="#FFFFFF" size={14} /> : null}</View><Text style={{ color: theme.text, fontSize: 12, marginLeft: 9 }}>到期后自动暂停调度</Text></Pressable><View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}><TextInput value={form.loadFactor} onChangeText={(loadFactor) => setForm((current) => current ? { ...current, loadFactor } : current)} keyboardType="decimal-pad" placeholder="负载因子（可选）" placeholderTextColor={theme.faint} style={{ flex: 1, color: theme.text, backgroundColor: theme.card, borderRadius: 10, padding: 10, fontSize: 12 }} /><TextInput value={form.expiresAt} onChangeText={(expiresAt) => setForm((current) => current ? { ...current, expiresAt } : current)} placeholder="到期时间（ISO 8601，可选，留空清除）" placeholderTextColor={theme.faint} style={{ flex: 2, color: theme.text, backgroundColor: theme.card, borderRadius: 10, padding: 10, fontSize: 12 }} /></View></View> : null}
                {save.error ? <Text style={{ color: theme.danger, fontSize: 12, lineHeight: 18, marginTop: 12 }}>{humanizeApiError(save.error)}</Text> : null}
                <Pressable accessibilityRole="button" disabled={save.isPending} onPress={submitEditor} style={{ marginTop: 18, borderRadius: 15, backgroundColor: save.isPending ? theme.muted : theme.primary, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{save.isPending ? '保存中…' : '二次确认并保存'}</Text></Pressable>
                <Text style={{ color: theme.faint, fontSize: 10, lineHeight: 15, marginTop: 10 }}>凭据字段不会在 APP 中显示，也不会随本次保存请求回传。</Text>
              </> : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}
