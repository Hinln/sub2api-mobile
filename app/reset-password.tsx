import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, LockKeyhole } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { resetPassword } from '@/src/services/password';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { theme } from '@/src/theme';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string; token?: string }>();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [token, setToken] = useState(typeof params.token === 'string' ? params.token : '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit() {
    setError(''); setMessage('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('请输入有效邮箱');
    if (!token.trim()) return setError('重置链接缺少一次性令牌，请从邮件重新打开');
    if (password.length < 6) return setError('密码至少需要 6 位');
    if (password !== confirm) return setError('两次输入的密码不一致');
    setBusy(true);
    try {
      const result = await resetPassword({ email: email.trim().toLowerCase(), token: token.trim(), new_password: password });
      setMessage(result.message || '密码已重置，请使用新密码登录');
      setPassword(''); setConfirm(''); setToken('');
    } catch (reason) { setError(humanizeApiError(reason)); } finally { setBusy(false); }
  }

  return <View style={{ flex: 1, backgroundColor: theme.page }}><ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 }}><Pressable onPress={() => router.back()} style={{ padding: 8 }}><ChevronLeft color={theme.text} size={22} /></Pressable><View><Text style={{ color: theme.text, fontSize: 25, fontWeight: '900' }}>设置新密码</Text><Text style={{ color: theme.subtext, marginTop: 3 }}>一次性链接只使用一次</Text></View></View>
    <View style={{ backgroundColor: theme.card, borderRadius: 22, borderColor: theme.border, borderWidth: 1, padding: 20 }}><View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}><LockKeyhole color={theme.primary} size={19} /></View><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 18, marginBottom: 7 }}>邮箱</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="name@example.com" placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: error ? theme.danger : theme.border, paddingHorizontal: 15, paddingVertical: 14 }} /><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 15, marginBottom: 7 }}>重置令牌</Text><TextInput value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} placeholder="邮件链接中的 token" placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: error ? theme.danger : theme.border, paddingHorizontal: 15, paddingVertical: 14 }} /><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 15, marginBottom: 7 }}>新密码</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" placeholder="至少 6 位" placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: error ? theme.danger : theme.border, paddingHorizontal: 15, paddingVertical: 14 }} /><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 15, marginBottom: 7 }}>确认新密码</Text><TextInput value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" placeholder="再次输入密码" placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: error ? theme.danger : theme.border, paddingHorizontal: 15, paddingVertical: 14 }} />{message ? <Text style={{ color: theme.success, fontSize: 13, lineHeight: 19, marginTop: 13 }}>{message}</Text> : null}{error ? <Text style={{ color: theme.danger, fontSize: 13, lineHeight: 19, marginTop: 13 }}>{error}</Text> : null}<Pressable disabled={busy} onPress={() => void submit()} style={{ marginTop: 17, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: busy ? theme.muted : theme.primary }}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '900' }}>保存新密码</Text>}</Pressable></View>
  </ScrollView></View>;
}
