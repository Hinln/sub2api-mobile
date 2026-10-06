import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Check, ChevronDown, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Badge, Card, StateCard } from '@/src/components/ui';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { newIdempotencyKey } from '@/src/lib/idempotency';
import { queryClient } from '@/src/lib/query-client';
import { deleteGroup, getGroup, getGroupModelAllowlistCandidates, updateGroup } from '@/src/services/admin';
import type { UpdateGroupRequest } from '@/src/types/admin';
import { theme } from '@/src/theme';

const PLATFORMS = ['anthropic', 'openai', 'gemini', 'antigravity', 'grok', 'kimi', 'zhipu', 'deepseek', 'minimax', 'opencode_go', 'composite'];

function parseModels(value: string) {
  return Array.from(new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)));
}

function OptionalField({ label, value, onChangeText, placeholder, multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean }) {
  return <View style={{ marginTop: 14 }}><Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '800', marginBottom: 7 }}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.faint} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={{ minHeight: multiline ? 86 : 46, color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 13, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 13, paddingVertical: multiline ? 11 : 0 }} /></View>;
}

export default function GroupDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const groupId = Number(params.id);
  const group = useQuery({ queryKey: ['group', groupId], queryFn: () => getGroup(groupId), enabled: Number.isFinite(groupId) });
  const item = group.data;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [rateMultiplier, setRateMultiplier] = useState('');
  const [modelAllowlistEnabled, setModelAllowlistEnabled] = useState(false);
  const [modelsText, setModelsText] = useState('');
  const [showPlatforms, setShowPlatforms] = useState(false);
  const [notice, setNotice] = useState<string>();
  const updateKey = useRef('');
  const deleteKey = useRef('');

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setDescription(item.description ?? '');
    setPlatform(item.platform ?? '');
    setStatus(item.status === 'inactive' ? 'inactive' : 'active');
    setRateMultiplier(typeof item.rate_multiplier === 'number' ? String(item.rate_multiplier) : '');
    if (item.model_allowlist) {
      setModelAllowlistEnabled(Boolean(item.model_allowlist.enabled));
      setModelsText(item.model_allowlist.models.join('\n'));
    }
  }, [item]);

  const candidateQuery = useQuery({
    queryKey: ['group-model-candidates', groupId, platform],
    queryFn: () => getGroupModelAllowlistCandidates(groupId, platform || undefined),
    enabled: Number.isFinite(groupId) && Boolean(item?.model_allowlist),
    retry: false,
  });
  const candidates = useMemo(() => candidateQuery.data?.models ?? [], [candidateQuery.data?.models]);

  const save = useMutation({
    mutationFn: (body: UpdateGroupRequest) => updateGroup(groupId, body, updateKey.current),
    onSuccess: (updated) => {
      updateKey.current = '';
      setNotice('已保存，服务端配置已更新');
      queryClient.setQueryData(['group', groupId], updated);
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteGroup(groupId, deleteKey.current),
    onSuccess: () => {
      deleteKey.current = '';
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      router.replace('/groups');
    },
  });

  if (!Number.isFinite(groupId)) return <StateCard error={new Error('分组 ID 无效')} />;

  function submit() {
    if (!item || !name.trim()) return;
    const body: UpdateGroupRequest = { name: name.trim(), description: description.trim() || null, platform: platform.trim(), status };
    if (rateMultiplier.trim()) {
      const parsed = Number(rateMultiplier);
      if (!Number.isFinite(parsed) || parsed < 0) { setNotice('倍率必须是非负数字'); return; }
      body.rate_multiplier = parsed;
    }
    if (item.model_allowlist) body.model_allowlist = { enabled: modelAllowlistEnabled, models: parseModels(modelsText) };
    if (!updateKey.current) updateKey.current = newIdempotencyKey(`admin-group-${groupId}-update`);
    setNotice(undefined);
    save.mutate(body);
  }

  function confirmDelete() {
    if (!item || remove.isPending) return;
    Alert.alert('删除分组', `将通过官方服务端删除「${item.name}」。此操作不可撤销。`, [
      { text: '取消', style: 'cancel' },
      { text: '确认删除', style: 'destructive', onPress: () => { if (!deleteKey.current) deleteKey.current = newIdempotencyKey(`admin-group-${groupId}-delete`); remove.mutate(); } },
    ]);
  }

  function addCandidate(model: string) {
    const next = parseModels(modelsText);
    if (!next.includes(model)) setModelsText([...next, model].join('\n'));
  }

  return <ScrollView style={{ flex: 1, backgroundColor: theme.page }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
    <StateCard loading={group.isLoading} error={group.error} onRetry={() => void group.refetch()} />
    {item ? <>
      <Card><View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 22, fontWeight: '900' }}>分组设置</Text><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 6 }}>ID {item.id} · {item.account_count ?? '--'} 个上游账号</Text></View><Badge label={status === 'active' ? '正常' : '已停用'} tone={status === 'active' ? 'success' : 'warning'} /></View>
        <OptionalField label="分组名称" value={name} onChangeText={(value) => { setName(value); setNotice(undefined); }} placeholder="例如：Claude 主线路" />
        <OptionalField label="描述" value={description} onChangeText={setDescription} placeholder="供管理员识别用途" multiline />
      </Card>

      <Card style={{ marginTop: 14 }}><Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>路由与状态</Text>
        <Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '800', marginTop: 15, marginBottom: 7 }}>平台（移动端支持的选项）</Text>
        <Pressable accessibilityRole="button" onPress={() => setShowPlatforms((value) => !value)} style={{ minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardRaised, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, color: theme.text }}>{platform || '未返回'}</Text><ChevronDown color={theme.faint} size={18} /></Pressable>
        {showPlatforms ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>{PLATFORMS.map((value) => <Pressable key={value} onPress={() => { setPlatform(value); setShowPlatforms(false); }} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: platform === value ? theme.primary : theme.cardRaised }}><Text style={{ color: platform === value ? '#fff' : theme.subtext, fontSize: 11, fontWeight: '800' }}>{value}</Text></Pressable>)}</View> : null}
        <Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '800', marginTop: 16, marginBottom: 7 }}>状态</Text>
        <View style={{ flexDirection: 'row', gap: 9 }}>{(['active', 'inactive'] as const).map((value) => <Pressable key={value} onPress={() => setStatus(value)} style={{ flex: 1, borderRadius: 12, backgroundColor: status === value ? theme.primary : theme.cardRaised, paddingVertical: 11, alignItems: 'center' }}><Text style={{ color: status === value ? '#fff' : theme.subtext, fontWeight: '800' }}>{value === 'active' ? '启用' : '停用'}</Text></Pressable>)}</View>
        <OptionalField label="倍率" value={rateMultiplier} onChangeText={setRateMultiplier} placeholder="仅在服务端返回时修改，例如 1.0" />
        <Text style={{ color: theme.faint, fontSize: 11, lineHeight: 17, marginTop: 7 }}>未返回的高级计费字段不会被写回，避免把不可用值误改为 0。</Text>
      </Card>

      {item.model_allowlist ? <Card style={{ marginTop: 14 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>模型白名单</Text><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 5 }}>启用后，服务端会同时限制模型列表和真实请求。</Text></View><Pressable accessibilityRole="switch" accessibilityState={{ checked: modelAllowlistEnabled }} onPress={() => setModelAllowlistEnabled((value) => !value)} style={{ width: 46, height: 28, borderRadius: 15, backgroundColor: modelAllowlistEnabled ? theme.primary : theme.muted, padding: 3, justifyContent: 'center', alignItems: modelAllowlistEnabled ? 'flex-end' : 'flex-start' }}><View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' }} /></Pressable></View><OptionalField label="允许的模型（每行一个）" value={modelsText} onChangeText={setModelsText} placeholder="由官方候选接口返回，或输入服务端已支持的模型" multiline />
        {candidateQuery.isLoading ? <Text style={{ color: theme.subtext, fontSize: 11, marginTop: 9 }}>正在读取官方模型候选…</Text> : null}
        {candidateQuery.error ? <Text style={{ color: theme.warning, fontSize: 11, lineHeight: 17, marginTop: 9 }}>候选接口不可用：{humanizeApiError(candidateQuery.error)}。仍可编辑服务端已返回的白名单。</Text> : null}
        {candidates.length ? <View style={{ marginTop: 12 }}><Text style={{ color: theme.subtext, fontSize: 11, fontWeight: '800', marginBottom: 7 }}>官方候选模型</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{candidates.map((model) => <Pressable key={model} onPress={() => addCandidate(model)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: parseModels(modelsText).includes(model) ? theme.successSoft : theme.cardRaised }}><Check color={theme.success} size={13} /><Text style={{ color: theme.subtext, fontSize: 10 }}>{model}</Text></Pressable>)}</View></View> : null}
      </Card> : null}

      {notice ? <View style={{ marginTop: 14, borderRadius: 13, backgroundColor: notice.includes('已保存') ? theme.successSoft : theme.warningSoft, padding: 12 }}><Text style={{ color: notice.includes('已保存') ? theme.success : theme.warning, fontSize: 12, fontWeight: '800' }}>{notice}</Text></View> : null}
      {save.error ? <Text style={{ color: theme.danger, fontSize: 12, lineHeight: 18, marginTop: 10 }}>{humanizeApiError(save.error)}</Text> : null}
      {remove.error ? <Text style={{ color: theme.danger, fontSize: 12, lineHeight: 18, marginTop: 10 }}>{humanizeApiError(remove.error)}</Text> : null}
      <Pressable accessibilityRole="button" disabled={save.isPending || !name.trim()} onPress={submit} style={{ marginTop: 18, borderRadius: 15, backgroundColor: save.isPending || !name.trim() ? theme.muted : theme.primary, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '900' }}>{save.isPending ? '保存中…' : '保存分组设置'}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={remove.isPending} onPress={confirmDelete} style={{ marginTop: 12, borderRadius: 15, borderWidth: 1, borderColor: theme.dangerSoft, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 7 }}><Trash2 color={theme.danger} size={17} /><Text style={{ color: theme.danger, fontWeight: '900' }}>{remove.isPending ? '删除中…' : '删除分组'}</Text></Pressable>
    </> : null}
  </ScrollView>;
}
