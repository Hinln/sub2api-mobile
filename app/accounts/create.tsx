import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Card, SectionTitle } from '@/src/components/ui';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { queryClient } from '@/src/lib/query-client';
import { createAccount } from '@/src/services/admin';
import { theme } from '@/src/theme';
import type { AccountType, CreateAccountRequest } from '@/src/types/admin';

const PLATFORMS = ['openai', 'anthropic', 'gemini', 'grok', 'upstream'];
const ACCOUNT_TYPES: AccountType[] = ['apikey', 'upstream'];

function numberOrUndefined(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function groupIds(value: string) {
  const ids = value.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item > 0);
  return ids.length ? ids : undefined;
}

function Field({ label, value, onChangeText, placeholder, secure, keyboardType = 'default', hint }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: 'default' | 'url' | 'number-pad' | 'decimal-pad';
  hint?: string;
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '700', marginBottom: 7 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.faint} secureTextEntry={secure} keyboardType={keyboardType} autoCapitalize="none" autoCorrect={false} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 13 }} />
      {hint ? <Text style={{ color: theme.faint, fontSize: 10, lineHeight: 16, marginTop: 6 }}>{hint}</Text> : null}
    </View>
  );
}

function ChoiceRow<T extends string>({ values, selected, onSelect }: { values: T[]; selected: T; onSelect: (value: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
      {values.map((value) => <Pressable key={value} onPress={() => onSelect(value)} style={{ borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: selected === value ? theme.primary : theme.cardRaised, borderWidth: 1, borderColor: selected === value ? theme.primary : theme.border }}><Text style={{ color: selected === value ? '#FFFFFF' : theme.subtext, fontSize: 11, fontWeight: '800' }}>{value}</Text></Pressable>)}
    </View>
  );
}

export default function CreateAccountScreen() {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('openai');
  const [type, setType] = useState<AccountType>('apikey');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [concurrency, setConcurrency] = useState('10');
  const [priority, setPriority] = useState('0');
  const [weight, setWeight] = useState('1');
  const [groups, setGroups] = useState('');
  const [notes, setNotes] = useState('');

  const valid = useMemo(() => {
    if (!name.trim() || !apiKey.trim()) return false;
    try { return ['http:', 'https:'].includes(new URL(baseUrl.trim()).protocol); } catch { return false; }
  }, [apiKey, baseUrl, name]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CreateAccountRequest = {
        name: name.trim(),
        platform,
        type,
        credentials: { base_url: baseUrl.trim().replace(/\/$/, ''), api_key: apiKey.trim() },
        concurrency: numberOrUndefined(concurrency),
        priority: numberOrUndefined(priority),
        rate_multiplier: numberOrUndefined(weight),
        group_ids: groupIds(groups),
        notes: notes.trim() || undefined,
      };
      return createAccount(payload);
    },
    onSuccess: (account) => {
      setApiKey('');
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      router.replace(`/accounts/${account.id}`);
    },
  });

  function confirmCreate() {
    Alert.alert('确认添加账号', `${name.trim()}\n${platform} · ${type}\n创建后将进入详情页测试连接。`, [
      { text: '取消', style: 'cancel' },
      { text: '创建', onPress: () => mutation.mutate() },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SectionTitle title="基础配置" />
        <Card>
          <Field label="名称" value={name} onChangeText={setName} placeholder="例如：OpenAI 主线路" />
          <Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '700', marginTop: 15 }}>平台</Text>
          <ChoiceRow values={PLATFORMS} selected={platform} onSelect={setPlatform} />
          <Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '700', marginTop: 15 }}>账号类型</Text>
          <ChoiceRow values={ACCOUNT_TYPES} selected={type} onSelect={setType} />
          <Field label="Base URL" value={baseUrl} onChangeText={setBaseUrl} keyboardType="url" placeholder="https://api.example.com" />
          <Field label="API Key" value={apiKey} onChangeText={setApiKey} secure placeholder="sk-..." hint="密钥仅随本次 HTTPS 请求提交，不写入本机日志或持久化存储。" />
        </Card>

        <SectionTitle title="调度配置" />
        <Card>
          <Field label="最大并发" value={concurrency} onChangeText={setConcurrency} keyboardType="number-pad" placeholder="10" />
          <Field label="优先级" value={priority} onChangeText={setPriority} keyboardType="number-pad" placeholder="0" hint="数值由 Hub 调度器按当前后端规则解释。" />
          <Field label="权重 / 计费倍率" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="1" />
          <Field label="分组 ID" value={groups} onChangeText={setGroups} placeholder="例如：1,2" hint="用于绑定已存在的分组与其模型策略；多个 ID 使用英文逗号分隔。" />
        </Card>

        <SectionTitle title="说明" />
        <Card>
          <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>模型限制与冷却由 Hub 管理</Text>
          <Text style={{ color: theme.subtext, fontSize: 11, lineHeight: 18, marginTop: 7 }}>当前稳定创建契约支持账号、凭据、并发、优先级、倍率与分组绑定。可用模型会在创建后的账号详情中通过真实模型接口读取；限流冷却状态由 Hub 自动维护。</Text>
          <Field label="备注（可选）" value={notes} onChangeText={setNotes} placeholder="用途、线路或负责人" />
        </Card>

        {mutation.error ? <Text style={{ color: theme.danger, fontSize: 12, lineHeight: 18, marginTop: 12 }}>{humanizeApiError(mutation.error)}</Text> : null}
        <Pressable disabled={!valid || mutation.isPending} onPress={confirmCreate} style={{ minHeight: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginTop: 18, backgroundColor: valid && !mutation.isPending ? theme.primary : theme.muted }}>
          <Text style={{ color: valid && !mutation.isPending ? '#FFFFFF' : theme.faint, fontWeight: '900' }}>{mutation.isPending ? '正在创建...' : '确认并创建账号'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
