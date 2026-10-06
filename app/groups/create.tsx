import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Card } from '@/src/components/ui';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { newIdempotencyKey } from '@/src/lib/idempotency';
import { createGroup } from '@/src/services/admin';
import { theme } from '@/src/theme';

const PLATFORMS = ['anthropic', 'openai', 'gemini', 'antigravity', 'grok', 'kimi', 'zhipu', 'deepseek', 'minimax', 'opencode_go', 'composite'];

export default function CreateGroupScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState('');
  const [rateMultiplier, setRateMultiplier] = useState('1');
  const [platformsOpen, setPlatformsOpen] = useState(false);
  const key = useRef('');
  const mutation = useMutation({
    mutationFn: () => createGroup({ name: name.trim(), description: description.trim(), platform: platform || undefined, rate_multiplier: Number(rateMultiplier) }, key.current),
    onSuccess: (group) => { key.current = ''; Alert.alert('分组已创建', '服务端已返回新分组配置。', [{ text: '查看分组', onPress: () => router.replace(`/groups/${group.id}`) }]); },
  });

  function submit() {
    if (!name.trim()) { Alert.alert('无法创建', '分组名称不能为空。'); return; }
    const multiplier = Number(rateMultiplier);
    if (!Number.isFinite(multiplier) || multiplier < 0) { Alert.alert('无法创建', '倍率必须是非负数字。'); return; }
    Alert.alert('确认创建分组', `${name.trim()}${platform ? ` · ${platform}` : ''}`, [
      { text: '取消', style: 'cancel' },
      { text: '确认创建', onPress: () => { if (!key.current) key.current = newIdempotencyKey('admin-group-create'); mutation.mutate(); } },
    ]);
  }

  return <ScrollView style={{ flex: 1, backgroundColor: theme.page }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
    <Card>
      <Text style={{ color: theme.text, fontSize: 22, fontWeight: '900' }}>新建分组</Text>
      <Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 7 }}>使用官方创建接口。移动端列出当前支持的平台；未填写的平台由服务端按默认规则处理。</Text>
      <Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '800', marginTop: 18, marginBottom: 7 }}>分组名称</Text>
      <TextInput accessibilityLabel="new-group-name" value={name} onChangeText={setName} placeholder="例如：Claude 主线路" placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 13, padding: 14 }} />
      <Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '800', marginTop: 15, marginBottom: 7 }}>描述</Text>
      <TextInput accessibilityLabel="new-group-description" value={description} onChangeText={setDescription} placeholder="供管理员识别用途（可选）" placeholderTextColor={theme.faint} multiline style={{ minHeight: 78, color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 13, padding: 14, textAlignVertical: 'top' }} />
      <Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '800', marginTop: 15, marginBottom: 7 }}>平台（可选）</Text>
      <Pressable accessibilityRole="button" onPress={() => setPlatformsOpen((value) => !value)} style={{ minHeight: 46, borderRadius: 13, backgroundColor: theme.cardRaised, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, color: platform ? theme.text : theme.faint }}>{platform || '由服务端默认'}</Text><ChevronDown color={theme.faint} size={18} /></Pressable>
      {platformsOpen ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>{PLATFORMS.map((value) => <Pressable key={value} onPress={() => { setPlatform(value); setPlatformsOpen(false); }} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: platform === value ? theme.primary : theme.cardRaised }}><Text style={{ color: platform === value ? '#fff' : theme.subtext, fontSize: 11, fontWeight: '800' }}>{value}</Text></Pressable>)}</View> : null}
      <Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '800', marginTop: 15, marginBottom: 7 }}>倍率</Text>
      <TextInput accessibilityLabel="new-group-rate-multiplier" value={rateMultiplier} onChangeText={setRateMultiplier} keyboardType="decimal-pad" placeholder="1" placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 13, padding: 14 }} />
      {mutation.error ? <Text style={{ color: theme.danger, fontSize: 12, lineHeight: 18, marginTop: 12 }}>{humanizeApiError(mutation.error)}</Text> : null}
      <Pressable accessibilityRole="button" disabled={mutation.isPending} onPress={submit} style={{ marginTop: 20, borderRadius: 15, backgroundColor: mutation.isPending ? theme.muted : theme.primary, paddingVertical: 14, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '900' }}>{mutation.isPending ? '创建中…' : '二次确认并创建'}</Text></Pressable>
    </Card>
  </ScrollView>;
}
