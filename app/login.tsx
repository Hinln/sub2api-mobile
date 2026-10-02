import { Link, Redirect, router } from 'expo-router';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPublicSettings, login, completeTwoFactor, AuthApiError } from '@/src/services/auth';
import { TurnstileGate } from '@/src/components/turnstile-gate';
import { adminConfigState, hasAuthenticatedSession } from '@/src/store/admin-config';
import { isAdmin } from '@/src/auth/session';
import { theme } from '@/src/theme';
import { VexluneLogo } from '@/src/components/vexlune-logo';

// CommonJS entry avoids import.meta in Expo Metro's classic web bundle.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useSnapshot } = require('valtio/react');

export default function LoginScreen() {
  const config = useSnapshot(adminConfigState);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileNonce, setTurnstileNonce] = useState('');
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void getPublicSettings()
      .then((settings) => { if (active) setRegistrationEnabled(settings.registration_enabled !== false); })
      // If public settings cannot be reached, do not expose a registration
      // action whose server-side policy we have not verified.
      .catch(() => { if (active) setRegistrationEnabled(false); });
    return () => { active = false; };
  }, []);

  if (hasAuthenticatedSession(config) && !busy) return <Redirect href={isAdmin(config.user) && config.workspaceMode !== 'user' ? '/monitor' : '/user'} />;

  async function submit() {
    setError('');
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) return setError('请输入有效邮箱');
    if (!password) return setError('请输入密码');
    setBusy(true);
    try {
      const result = await login({ email: email.trim().toLowerCase(), password, turnstile_token: turnstileToken || undefined, turnstile_nonce: turnstileNonce || undefined });
      if (result.requires_2fa && result.temp_token) { setTempToken(result.temp_token); return; }
      router.replace(isAdmin(result.user ?? null) ? '/monitor' : '/user');
    } catch (reason) {
      setTurnstileToken(''); setTurnstileNonce(''); setTurnstileReset((value) => value + 1);
      setError(reason instanceof AuthApiError && reason.challenge ? '请先完成 Cloudflare 人机验证，再重试登录。' : reason instanceof Error ? reason.message : '登录失败，请稍后重试');
    } finally { setBusy(false); }
  }

  async function submitTwoFactor() {
    if (!/^\d{6}$/.test(totpCode)) { setError('请输入 6 位验证码'); return; }
    setBusy(true); setError('');
    try { const result = await completeTwoFactor(tempToken, totpCode); router.replace(isAdmin(result.user ?? null) ? '/monitor' : '/user'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '二次验证失败，请重试'); }
    finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: 30 }}><VexluneLogo /><Text style={{ color: theme.text, fontSize: 28, fontWeight: '900', marginTop: 16 }}>Vexlune Hub</Text><Text style={{ color: theme.subtext, fontSize: 13, marginTop: 7 }}>安全登录你的工作台</Text></View>
          <View style={{ backgroundColor: theme.card, borderRadius: 24, borderColor: theme.border, borderWidth: 1, padding: 20 }}>
            {tempToken ? <>
              <Text style={{ color: theme.text, fontSize: 19, fontWeight: '900' }}>需要二次验证</Text><Text style={{ color: theme.subtext, fontSize: 13, lineHeight: 20, marginTop: 8 }}>请输入验证器中的 6 位验证码。</Text>
              <TextInput accessibilityLabel="totp-code" value={totpCode} onChangeText={(value) => { setTotpCode(value.replace(/\D/g, '').slice(0, 6)); setError(''); }} keyboardType="number-pad" maxLength={6} placeholder="000000" placeholderTextColor={theme.faint} style={{ marginTop: 18, color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: error ? theme.danger : theme.border, paddingHorizontal: 15, paddingVertical: 14, fontSize: 21, letterSpacing: 8, textAlign: 'center' }} />
              {error ? <Text style={{ color: theme.danger, fontSize: 13, lineHeight: 19, marginTop: 13 }}>{error}</Text> : null}
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submitTwoFactor()} style={{ marginTop: 16, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: busy ? theme.muted : theme.primary }}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '900' }}>完成登录</Text>}</Pressable>
              <Pressable onPress={() => { setTempToken(''); setTotpCode(''); setTurnstileToken(''); setTurnstileNonce(''); setTurnstileReset((value) => value + 1); setError(''); }} style={{ alignItems: 'center', paddingTop: 16 }}><Text style={{ color: theme.primary, fontWeight: '800', fontSize: 13 }}>返回登录</Text></Pressable>
            </> : <>
              <Text style={{ color: theme.text, fontSize: 19, fontWeight: '900' }}>登录</Text><Text style={{ color: theme.subtext, fontSize: 13, marginTop: 6 }}>使用邮箱和密码继续</Text>
              <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 19, marginBottom: 7 }}>邮箱</Text><TextInput accessibilityLabel="email" value={email} onChangeText={(value) => { setEmail(value); setError(''); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" placeholder="name@example.com" placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: error ? theme.danger : theme.border, paddingHorizontal: 15, paddingVertical: 14 }} />
              <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 15, marginBottom: 7 }}>密码</Text><View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardRaised, borderRadius: 14, borderWidth: 1, borderColor: error ? theme.danger : theme.border }}><TextInput accessibilityLabel="password" value={password} onChangeText={(value) => { setPassword(value); setError(''); }} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} textContentType="password" placeholder="请输入密码" placeholderTextColor={theme.faint} onSubmitEditing={() => void submit()} style={{ flex: 1, color: theme.text, paddingHorizontal: 15, paddingVertical: 14 }} /><Pressable accessibilityLabel="toggle-password" onPress={() => setShowPassword((value) => !value)} style={{ padding: 13 }}>{showPassword ? <EyeOff color={theme.subtext} size={19} /> : <Eye color={theme.subtext} size={19} />}</Pressable></View>
              <View style={{ alignItems: 'flex-end', marginTop: 9 }}><Link href="/forgot-password" asChild><Pressable accessibilityRole="link"><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>忘记密码？</Text></Pressable></Link></View>
              <TurnstileGate action="login" resetKey={turnstileReset} onToken={(token, nonce) => { setTurnstileToken(token); setTurnstileNonce(nonce); }} />
              {error ? <Text style={{ color: theme.danger, fontSize: 13, lineHeight: 19, marginTop: 13 }}>{error}</Text> : null}
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={{ marginTop: 17, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: busy ? theme.muted : theme.primary }}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '900' }}>登录</Text>}</Pressable>
              {registrationEnabled ? <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 18 }}><Text style={{ color: theme.subtext, fontSize: 13 }}>还没有账号？</Text><Link href="/register" asChild><Pressable><Text style={{ color: theme.primary, fontSize: 13, fontWeight: '900' }}>注册</Text></Pressable></Link></View> : null}
            </>}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 20 }}><ShieldCheck color={theme.success} size={15} /><Text style={{ color: theme.faint, fontSize: 11 }}>会话凭据仅保存于系统 SecureStore</Text></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
