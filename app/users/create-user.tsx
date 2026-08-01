import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Card } from '@/src/components/ui';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { queryClient } from '@/src/lib/query-client';
import { createUser } from '@/src/services/admin';
import { theme } from '@/src/theme';

function Field({ label, value, onChangeText, secure, keyboardType = 'default' }: { label: string; value: string; onChangeText: (value: string) => void; secure?: boolean; keyboardType?: 'default' | 'email-address' | 'decimal-pad' }) {
  return <View style={{ marginTop: 14 }}><Text style={{ color: theme.subtext, fontSize: 12, marginBottom: 7 }}>{label}</Text><TextInput value={value} onChangeText={onChangeText} secureTextEntry={secure} keyboardType={keyboardType} autoCapitalize="none" autoCorrect={false} placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 13 }} /></View>;
}

export default function CreateUserScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [notes, setNotes] = useState('');
  const [balance, setBalance] = useState('0');
  const mutation = useMutation({ mutationFn: () => createUser({ email: email.trim(), password, username: username.trim() || undefined, notes: notes.trim() || undefined, role: 'user', status: 'active', balance: Number(balance) || 0 }), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['users'] }); router.back(); } });
  const valid = email.includes('@') && password.length >= 8 && Number.isFinite(Number(balance));

  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 44 }} keyboardShouldPersistTaps="handled"><Card><Text style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>{'\u57fa\u672c\u4fe1\u606f'}</Text><Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 6 }}>{'\u5bc6\u7801\u4ec5\u5728\u672c\u6b21 HTTPS \u8bf7\u6c42\u4e2d\u63d0\u4ea4\uff0c\u4e0d\u4fdd\u5b58\u5230\u672c\u673a\u6216\u65e5\u5fd7\u3002'}</Text><Field label={'\u90ae\u7bb1'} value={email} onChangeText={setEmail} keyboardType="email-address" /><Field label={'\u521d\u59cb\u5bc6\u7801\uff08\u81f3\u5c11 8 \u4f4d\uff09'} value={password} onChangeText={setPassword} secure /><Field label={'\u7528\u6237\u540d\uff08\u53ef\u9009\uff09'} value={username} onChangeText={setUsername} /><Field label={'\u5907\u6ce8\uff08\u53ef\u9009\uff09'} value={notes} onChangeText={setNotes} /><Field label={'\u521d\u59cb\u4f59\u989d'} value={balance} onChangeText={setBalance} keyboardType="decimal-pad" /></Card>{mutation.error ? <Text style={{ color: theme.danger, fontSize: 12, lineHeight: 18, marginTop: 12 }}>{humanizeApiError(mutation.error)}</Text> : null}<Pressable disabled={!valid || mutation.isPending} onPress={() => Alert.alert('\u786e\u8ba4\u521b\u5efa\u7528\u6237', `${email}\n\u521d\u59cb\u4f59\u989d $${Number(balance || 0).toFixed(2)}`, [{ text: '\u53d6\u6d88', style: 'cancel' }, { text: '\u521b\u5efa', onPress: () => mutation.mutate() }])} style={{ marginTop: 16, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: valid ? theme.primary : theme.muted }}><Text style={{ color: valid ? '#FFFFFF' : theme.faint, fontWeight: '900' }}>{mutation.isPending ? '\u521b\u5efa\u4e2d...' : '\u4e8c\u6b21\u786e\u8ba4\u5e76\u521b\u5efa'}</Text></Pressable></ScrollView></KeyboardAvoidingView>;
}
