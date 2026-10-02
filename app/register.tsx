import { Link, router } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthApiError, getPublicSettings, register, sendVerifyCode } from '@/src/services/auth';
import { TurnstileGate } from '@/src/components/turnstile-gate';
import { theme } from '@/src/theme';
import { VexluneLogo } from '@/src/components/vexlune-logo';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyStep, setVerifyStep] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileNonce, setTurnstileNonce] = useState('');
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void getPublicSettings()
      .then((settings) => { if (active) setRegistrationEnabled(settings.registration_enabled !== false); })
      .catch(() => { if (active) setRegistrationEnabled(false); });
    return () => { active = false; };
  }, []);

  async function submit() {
    setError(''); setNotice('');
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) return setError('请输入有效邮箱');
    if (password.length < 6) return setError('密码至少需要 6 位');
    if (password !== confirm) return setError('两次输入的密码不一致');
    setBusy(true);
    try {
      const settings = await getPublicSettings();
      if (settings.registration_enabled === false) {
        setRegistrationEnabled(false);
        setError('\u5f53\u524d\u5df2\u5173\u95ed\u6ce8\u518c\uff0c\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458');
        return;
      }
      if (settings.email_verify_enabled && !verifyStep) {
        await sendVerifyCode({ email: email.trim().toLowerCase(), turnstile_token: turnstileToken || undefined, turnstile_nonce: turnstileNonce || undefined });
        setTurnstileToken(''); setTurnstileNonce(''); setTurnstileReset((value) => value + 1);
        setVerifyStep(true); setNotice('验证码已发送，请检查邮箱'); return;
      }
      await register({ email: email.trim().toLowerCase(), password, verify_code: verifyCode || undefined, turnstile_token: turnstileToken || undefined, turnstile_nonce: turnstileNonce || undefined });
      router.replace('/user');
    } catch (reason) {
      setTurnstileToken(''); setTurnstileNonce(''); setTurnstileReset((value) => value + 1);
      setError(reason instanceof AuthApiError && reason.challenge ? '请先完成 Cloudflare 人机验证，再重试。' : reason instanceof Error ? reason.message : '注册失败，请稍后重试');
    } finally { setBusy(false); }
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
    <View style={{ alignItems: 'center', marginBottom: 30 }}><VexluneLogo /><Text style={{ color: theme.text, fontSize: 28, fontWeight: '900', marginTop: 16 }}>创建 Vexlune 账号</Text><Text style={{ color: theme.subtext, fontSize: 13, marginTop: 7 }}>首屏仅收集邮箱和密码</Text></View>
    <View style={{ backgroundColor: theme.card, borderRadius: 24, borderColor: theme.border, borderWidth: 1, padding: 20 }}>
      <Text style={{ color: theme.subtext, fontSize: 12, marginBottom: 7 }}>邮箱</Text><TextInput accessibilityLabel="register-email" value={email} onChangeText={(value) => { setEmail(value); setError(''); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="name@example.com" placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: error ? theme.danger : theme.border, paddingHorizontal: 15, paddingVertical: 14 }} />
      <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 15, marginBottom: 7 }}>密码</Text><View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: error ? theme.danger : theme.border }}><TextInput accessibilityLabel="register-password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} placeholder="至少 6 位" placeholderTextColor={theme.faint} style={{ flex: 1, color: theme.text, paddingHorizontal: 15, paddingVertical: 14 }} /><Pressable accessibilityLabel="toggle-register-password" onPress={() => setShowPassword((value) => !value)} style={{ padding: 13 }}>{showPassword ? <EyeOff color={theme.subtext} size={19} /> : <Eye color={theme.subtext} size={19} />}</Pressable></View>
      <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 15, marginBottom: 7 }}>确认密码</Text><TextInput accessibilityLabel="register-confirm-password" value={confirm} onChangeText={setConfirm} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} placeholder="再次输入密码" placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: error ? theme.danger : theme.border, paddingHorizontal: 15, paddingVertical: 14 }} />
      {verifyStep ? <><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 15, marginBottom: 7 }}>邮箱验证码</Text><TextInput accessibilityLabel="register-verify-code" value={verifyCode} onChangeText={(value) => setVerifyCode(value.replace(/\D/g, '').slice(0, 8))} keyboardType="number-pad" placeholder="请输入验证码" placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 15, paddingVertical: 14 }} /></> : null}
      <TurnstileGate action="register" resetKey={turnstileReset} onToken={(token, nonce) => { setTurnstileToken(token); setTurnstileNonce(nonce); }} />
      {registrationEnabled === false ? <Text style={{ color: theme.warning, fontSize: 13, lineHeight: 19, marginTop: 13 }}>{'当前已关闭公开注册，请返回登录或联系管理员。'}</Text> : null}{notice ? <Text style={{ color: theme.success, fontSize: 13, lineHeight: 19, marginTop: 13 }}>{notice}</Text> : null}{error ? <Text style={{ color: theme.danger, fontSize: 13, lineHeight: 19, marginTop: 13 }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy || registrationEnabled !== true} onPress={() => void submit()} style={{ marginTop: 17, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: busy || registrationEnabled !== true ? theme.muted : theme.primary }}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '900' }}>{registrationEnabled === false ? '注册已关闭' : registrationEnabled === null ? '检查注册状态…' : verifyStep ? '完成注册' : '创建账号'}</Text>}</Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 18 }}><Text style={{ color: theme.subtext, fontSize: 13 }}>已有账号？</Text><Link href="/login" asChild><Pressable><Text style={{ color: theme.primary, fontSize: 13, fontWeight: '900' }}>返回登录</Text></Pressable></Link></View>
    </View>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
