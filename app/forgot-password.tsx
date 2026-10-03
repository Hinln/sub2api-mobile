import { Link, router } from 'expo-router';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { AuthApiError, getPublicSettings } from '@/src/services/auth';
import { requestPasswordReset } from '@/src/services/password';
import { TurnstileGate } from '@/src/components/turnstile-gate';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { theme } from '@/src/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetEnabled, setResetEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void getPublicSettings()
      .then((settings) => { if (active) setResetEnabled(settings.password_reset_enabled === true); })
      .catch(() => { if (active) setResetEnabled(false); });
    return () => { active = false; };
  }, []);

  async function submit() {
    setError(''); setMessage('');
    if (resetEnabled !== true) { setError(resetEnabled === false ? '当前未开放密码找回，请联系管理员' : '正在检查密码找回设置，请稍候'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('请输入有效邮箱'); return; }
    setBusy(true);
    try {
      await requestPasswordReset({ email: email.trim().toLowerCase(), turnstile_token: token || undefined });
      setMessage('如果账号存在，密码重置链接将发送到邮箱。请从邮件打开链接完成重置。');
      setToken(''); setResetKey((value) => value + 1);
    } catch (reason) {
      setToken(''); setResetKey((value) => value + 1);
      setError(reason instanceof AuthApiError && reason.challenge ? '请先完成 Cloudflare 人机验证，再重试。' : humanizeApiError(reason));
    } finally { setBusy(false); }
  }

  return <View style={{ flex: 1, backgroundColor: theme.page }}><ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 }}><Pressable onPress={() => router.back()} style={{ padding: 8 }}><ChevronLeft color={theme.text} size={22} /></Pressable><View><Text style={{ color: theme.text, fontSize: 25, fontWeight: '900' }}>找回密码</Text><Text style={{ color: theme.subtext, marginTop: 3 }}>通过注册邮箱接收重置链接</Text></View></View>
    <View style={{ backgroundColor: theme.card, borderRadius: 22, borderColor: theme.border, borderWidth: 1, padding: 20 }}><View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Mail color={theme.primary} size={19} /></View><Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 13 }}>为保护账号隐私，无论邮箱是否注册，服务端都会返回相同提示。</Text>{resetEnabled === false ? <Text style={{ color: theme.warning, fontSize: 13, lineHeight: 19, marginTop: 16 }}>当前未开放密码找回，请联系管理员。</Text> : <><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 18, marginBottom: 7 }}>邮箱</Text><TextInput accessibilityLabel="forgot-email" value={email} onChangeText={(value) => { setEmail(value); setError(''); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="name@example.com" placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: error ? theme.danger : theme.border, paddingHorizontal: 15, paddingVertical: 14 }} /><TurnstileGate action="forgot_password" resetKey={resetKey} onToken={setToken} /></>}{message ? <Text style={{ color: theme.success, fontSize: 13, lineHeight: 19, marginTop: 13 }}>{message}</Text> : null}{error ? <Text style={{ color: theme.danger, fontSize: 13, lineHeight: 19, marginTop: 13 }}>{error}</Text> : null}<Pressable disabled={busy || resetEnabled !== true} onPress={() => void submit()} style={{ marginTop: 17, minHeight: 50, borderRadius: 15, backgroundColor: busy || resetEnabled !== true ? theme.muted : theme.primary, alignItems: 'center', justifyContent: 'center' }}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '900' }}>{resetEnabled === false ? '密码找回已关闭' : resetEnabled === null ? '检查设置中…' : '发送重置链接'}</Text>}</Pressable><View style={{ alignItems: 'center', marginTop: 18 }}><Link href="/login" asChild><Pressable><Text style={{ color: theme.primary, fontWeight: '800', fontSize: 13 }}>返回登录</Text></Pressable></Link></View></View>
  </ScrollView></View>;
}
