import { Link, Redirect, router } from 'expo-router';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { AuthBackdrop } from '@/src/components/auth-backdrop';
import { LoginAgreementNotice } from '@/src/components/login-agreement';
import { TurnstileGate } from '@/src/components/turnstile-gate';
import { VexluneLogo } from '@/src/components/vexlune-logo';
import { isAdmin } from '@/src/auth/session';
import { AuthApiError, completeTwoFactor, getPublicSettings, login } from '@/src/services/auth';
import { adminConfigState, hasAuthenticatedSession } from '@/src/store/admin-config';

// CommonJS entry avoids import.meta in Expo Metro's classic web bundle.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useSnapshot } = require('valtio/react');

const authColors = {
  ink: '#142452',
  subtext: '#7382A5',
  faint: '#96A3C0',
  line: '#DCE5F4',
  field: '#FFFFFFD9',
  primary: '#6D6CF4',
  primarySoft: '#EEF0FF',
  danger: '#C73D53',
};

function GradientAction({ label, busy, disabled, onPress }: { label: string; busy: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled || busy} onPress={onPress} style={{ height: 56, borderRadius: 17, overflow: 'hidden', opacity: disabled ? 0.62 : 1 }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute' }}>
        <Defs><SvgLinearGradient id="authButton" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#B492FF" /><Stop offset="0.52" stopColor="#6D7CF4" /><Stop offset="1" stopColor="#68D7F0" /></SvgLinearGradient></Defs>
        <Rect x="0" y="0" width="100" height="100" rx="17" fill="url(#authButton)" />
      </Svg>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 11 }}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '900' }}>{label}</Text>}
        {!busy ? <ArrowRight color="#FFFFFF" size={21} strokeWidth={2.2} /> : null}
      </View>
    </Pressable>
  );
}

function AuthField({ icon, label, helper, children }: { icon: ReactNode; label: string; helper: string; children: ReactNode }) {
  return <View style={{ marginTop: 16 }}>
    <Text style={{ color: authColors.ink, fontSize: 13, fontWeight: '800', marginBottom: 7 }}>{label}</Text>
    <View style={{ minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: authColors.line, backgroundColor: authColors.field, flexDirection: 'row', alignItems: 'center', paddingLeft: 15 }}>
      {icon}
      {children}
    </View>
    <Text style={{ color: authColors.subtext, fontSize: 11, lineHeight: 17, marginTop: 6 }}>{helper}</Text>
  </View>;
}

function AuthTabs() {
  return <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: authColors.line, marginBottom: 20 }}>
    <View style={{ flex: 1, alignItems: 'center', paddingBottom: 13, borderBottomWidth: 3, borderBottomColor: authColors.primary }}><Text style={{ color: authColors.ink, fontSize: 19, fontWeight: '900' }}>登录</Text></View>
    <Pressable accessibilityRole="tab" onPress={() => router.replace('/register')} style={{ flex: 1, alignItems: 'center', paddingBottom: 13 }}><Text style={{ color: authColors.faint, fontSize: 19, fontWeight: '800' }}>注册</Text></Pressable>
  </View>;
}

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
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [agreementSubmitAttempt, setAgreementSubmitAttempt] = useState(0);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);
  const [passwordResetEnabled, setPasswordResetEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void getPublicSettings().then((settings) => {
      if (!active) return;
      setRegistrationEnabled(settings.registration_enabled !== false);
      setPasswordResetEnabled(settings.password_reset_enabled === true);
    }).catch(() => { if (active) { setRegistrationEnabled(false); setPasswordResetEnabled(false); } });
    return () => { active = false; };
  }, []);

  if (hasAuthenticatedSession(config) && !busy) return <Redirect href={isAdmin(config.user) && config.workspaceMode !== 'user' ? '/monitor' : '/user'} />;

  async function submit() {
    setError('');
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) return setError('请输入有效邮箱');
    if (!password) return setError('请输入密码');
    setAgreementSubmitAttempt((value) => value + 1);
    setBusy(true);
    try {
      const result = await login({ email: email.trim().toLowerCase(), password, turnstile_token: turnstileToken || undefined });
      if (result.requires_2fa && result.temp_token) { setTempToken(result.temp_token); return; }
      router.replace(isAdmin(result.user ?? null) ? '/monitor' : '/user');
    } catch (reason) {
      setTurnstileToken(''); setTurnstileReset((value) => value + 1);
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

  return <AuthBackdrop>
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: 'center', marginBottom: 23 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 15 }}><Sparkles color="#8C7DF7" size={14} /><Text style={{ color: '#7D8DB5', fontSize: 12, letterSpacing: 1 }}>让 AI 创造更好的你</Text></View>
            <VexluneLogo size={62} />
            <Text style={{ color: authColors.ink, fontSize: 31, fontWeight: '900', letterSpacing: 0.2, marginTop: 12 }}>Vexlune Hub</Text>
            <Text style={{ color: authColors.ink, fontSize: 16, letterSpacing: 8, marginTop: 4 }}>AI 平台入口</Text>
            <Text style={{ color: authColors.subtext, fontSize: 13, letterSpacing: 2, marginTop: 11 }}>连接智能 · 激发无限可能</Text>
          </View>

          <View style={{ backgroundColor: '#FFFFFFD9', borderRadius: 26, borderWidth: 1, borderColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 21, paddingBottom: 19, shadowColor: '#7189B8', shadowOpacity: 0.12, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 5 }}>
            {tempToken ? <>
              <Text style={{ color: authColors.ink, fontSize: 20, fontWeight: '900' }}>需要二次验证</Text><Text style={{ color: authColors.subtext, fontSize: 13, lineHeight: 20, marginTop: 8 }}>请输入验证器中的 6 位验证码。</Text>
              <TextInput accessibilityLabel="totp-code" value={totpCode} onChangeText={(value) => { setTotpCode(value.replace(/\D/g, '').slice(0, 6)); setError(''); }} keyboardType="number-pad" maxLength={6} placeholder="000000" placeholderTextColor={authColors.faint} style={{ marginTop: 18, color: authColors.ink, backgroundColor: authColors.field, borderRadius: 16, borderWidth: 1, borderColor: error ? authColors.danger : authColors.line, paddingHorizontal: 15, paddingVertical: 14, fontSize: 21, letterSpacing: 8, textAlign: 'center' }} />
              {error ? <Text style={{ color: authColors.danger, fontSize: 13, lineHeight: 19, marginTop: 13 }}>{error}</Text> : null}
              <View style={{ marginTop: 17 }}><GradientAction label="完成登录" busy={busy} onPress={() => void submitTwoFactor()} /></View>
              <Pressable onPress={() => { setTempToken(''); setTotpCode(''); setTurnstileToken(''); setTurnstileReset((value) => value + 1); setError(''); }} style={{ alignItems: 'center', paddingTop: 16 }}><Text style={{ color: authColors.primary, fontWeight: '800', fontSize: 13 }}>返回登录</Text></Pressable>
            </> : <>
              <AuthTabs />
              <AuthField icon={<Mail color={authColors.subtext} size={20} />} label="邮箱地址" helper="请输入您的邮箱地址"><TextInput accessibilityLabel="email" value={email} onChangeText={(value) => { setEmail(value); setError(''); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" placeholder="name@example.com" placeholderTextColor={authColors.faint} style={{ flex: 1, color: authColors.ink, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15 }} /></AuthField>
              <AuthField icon={<LockKeyhole color={authColors.subtext} size={20} />} label="密码" helper="请输入密码（至少 6 位）"><TextInput accessibilityLabel="password" value={password} onChangeText={(value) => { setPassword(value); setError(''); }} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} textContentType="password" placeholder="请输入密码" placeholderTextColor={authColors.faint} onSubmitEditing={() => void submit()} style={{ flex: 1, color: authColors.ink, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15 }} /><Pressable accessibilityLabel="toggle-password" onPress={() => setShowPassword((value) => !value)} style={{ padding: 13 }}>{showPassword ? <EyeOff color={authColors.subtext} size={19} /> : <Eye color={authColors.subtext} size={19} />}</Pressable></AuthField>
              {passwordResetEnabled ? <View style={{ alignItems: 'flex-end', marginTop: 6 }}><Link href="/forgot-password" asChild><Pressable accessibilityRole="link"><Text style={{ color: '#2D63DA', fontSize: 13, fontWeight: '800' }}>忘记密码？</Text></Pressable></Link></View> : null}
              <TurnstileGate action="login" resetKey={turnstileReset} consentRequestKey={agreementSubmitAttempt} onToken={setTurnstileToken} />
              {error ? <Text style={{ color: authColors.danger, fontSize: 13, lineHeight: 19, marginTop: 13 }}>{error}</Text> : null}
              <View style={{ marginTop: 17 }}><GradientAction label="登录" busy={busy} onPress={() => void submit()} /></View>
              {registrationEnabled === false ? <Text style={{ color: authColors.subtext, fontSize: 12, textAlign: 'center', marginTop: 15 }}>当前未开放公开注册</Text> : null}
              <LoginAgreementNotice action="login" />
            </>}
          </View>
          <View style={{ alignItems: 'center', marginTop: 24 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><ShieldCheck color="#7C91B8" size={14} /><Text style={{ color: '#8798BA', fontSize: 11 }}>会话凭据仅保存于系统 SecureStore</Text></View><Text style={{ color: '#8295BA', fontSize: 10, letterSpacing: 4, marginTop: 23 }}>VEXLUNE HUB</Text><Text style={{ color: '#9AA8C4', fontSize: 9, letterSpacing: 2, marginTop: 6 }}>INTELLIGENCE FOR A BRIGHTER TOMORROW</Text></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </AuthBackdrop>;
}
