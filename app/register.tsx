import { router } from 'expo-router';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { AuthBackdrop } from '@/src/components/auth-backdrop';
import { LoginAgreementNotice } from '@/src/components/login-agreement';
import { TurnstileGate } from '@/src/components/turnstile-gate';
import { VexluneLogo } from '@/src/components/vexlune-logo';
import { AuthApiError, getPublicSettings, register, sendVerifyCode } from '@/src/services/auth';
import { canSubmitTurnstile, isUsableTurnstileToken, type TurnstileStatus } from '@/src/lib/turnstile';

const authColors = {
  ink: '#142452',
  subtext: '#7382A5',
  faint: '#96A3C0',
  line: '#DCE5F4',
  field: '#FFFFFFD9',
  primary: '#6D6CF4',
  danger: '#C73D53',
};

function GradientAction({ label, busy, disabled, onPress }: { label: string; busy: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" disabled={disabled || busy} onPress={onPress} style={{ height: 56, borderRadius: 17, overflow: 'hidden', opacity: disabled ? 0.62 : 1 }}>
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute' }}>
      <Defs><SvgLinearGradient id="authRegisterButton" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#B492FF" /><Stop offset="0.52" stopColor="#6D7CF4" /><Stop offset="1" stopColor="#68D7F0" /></SvgLinearGradient></Defs>
      <Rect x="0" y="0" width="100" height="100" rx="17" fill="url(#authRegisterButton)" />
    </Svg>
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 11 }}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '900' }}>{label}</Text>}{!busy ? <ArrowRight color="#FFFFFF" size={21} strokeWidth={2.2} /> : null}</View>
  </Pressable>;
}

function AuthField({ icon, label, helper, children }: { icon: ReactNode; label: string; helper: string; children: ReactNode }) {
  return <View style={{ marginTop: 15 }}><Text style={{ color: authColors.ink, fontSize: 13, fontWeight: '800', marginBottom: 7 }}>{label}</Text><View style={{ minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: authColors.line, backgroundColor: authColors.field, flexDirection: 'row', alignItems: 'center', paddingLeft: 15 }}>{icon}{children}</View><Text style={{ color: authColors.subtext, fontSize: 11, lineHeight: 17, marginTop: 6 }}>{helper}</Text></View>;
}

function AuthTabs() {
  return <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: authColors.line, marginBottom: 17 }}>
    <Pressable accessibilityRole="tab" onPress={() => router.replace('/login')} style={{ flex: 1, alignItems: 'center', paddingBottom: 13 }}><Text style={{ color: authColors.faint, fontSize: 19, fontWeight: '800' }}>登录</Text></Pressable>
    <View style={{ flex: 1, alignItems: 'center', paddingBottom: 13, borderBottomWidth: 3, borderBottomColor: authColors.primary }}><Text style={{ color: authColors.ink, fontSize: 19, fontWeight: '900' }}>注册</Text></View>
  </View>;
}

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
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [agreementSubmitAttempt, setAgreementSubmitAttempt] = useState(0);
  const turnstileStatusRef = useRef<TurnstileStatus>('loading');
  const turnstileTokenRef = useRef('');
  const pendingSubmitRef = useRef(false);
  const submitInFlightRef = useRef(false);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void getPublicSettings().then((settings) => { if (active) setRegistrationEnabled(settings.registration_enabled !== false); }).catch(() => { if (active) setRegistrationEnabled(false); });
    return () => { active = false; };
  }, []);

  function handleTurnstileStatus(status: TurnstileStatus) {
    turnstileStatusRef.current = status;
    if (status === 'disabled' && pendingSubmitRef.current && !submitInFlightRef.current) {
      pendingSubmitRef.current = false;
      void submit('');
    }
  }

  function handleTurnstileToken(token: string) {
    turnstileTokenRef.current = token;
    if (isUsableTurnstileToken(token)) {
      turnstileStatusRef.current = 'token';
      if (pendingSubmitRef.current && !submitInFlightRef.current) {
        pendingSubmitRef.current = false;
        void submit(token);
      }
    }
  }

  async function submit(overrideToken?: string) {
    if (submitInFlightRef.current) return;
    setError(''); setNotice('');
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) return setError('请输入有效邮箱');
    if (password.length < 6) return setError('密码至少需要 6 位');
    if (password !== confirm) return setError('两次输入的密码不一致');
    const token = overrideToken ?? turnstileTokenRef.current;
    if (!canSubmitTurnstile(turnstileStatusRef.current, token)) {
      pendingSubmitRef.current = true;
      setAgreementSubmitAttempt((value) => value + 1);
      if (turnstileStatusRef.current === 'error') {
        turnstileTokenRef.current = '';
        setTurnstileReset((value) => value + 1);
        setError('安全验证组件加载失败，正在重新加载，请完成验证后再试。');
      } else {
        setError('请先完成 Cloudflare 人机验证，完成后将自动继续注册。');
      }
      return;
    }
    pendingSubmitRef.current = false;
    setAgreementSubmitAttempt((value) => value + 1);
    setBusy(true);
    submitInFlightRef.current = true;
    try {
      const settings = await getPublicSettings();
      if (settings.registration_enabled === false) {
        setRegistrationEnabled(false);
        setError('当前已关闭注册，请联系管理员');
        return;
      }
      if (settings.email_verify_enabled && !verifyStep) {
        await sendVerifyCode({ email: email.trim().toLowerCase(), turnstile_token: token || undefined });
        turnstileTokenRef.current = ''; setTurnstileReset((value) => value + 1);
        setVerifyStep(true); setNotice('验证码已发送，请检查邮箱'); return;
      }
      await register({ email: email.trim().toLowerCase(), password, verify_code: verifyCode || undefined, turnstile_token: token || undefined });
      router.replace('/user');
    } catch (reason) {
      turnstileTokenRef.current = ''; setTurnstileReset((value) => value + 1);
      setError(reason instanceof AuthApiError && reason.challenge ? '请先完成 Cloudflare 人机验证，再重试。' : reason instanceof Error ? reason.message : '注册失败，请稍后重试');
    } finally { submitInFlightRef.current = false; setBusy(false); }
  }

  return <AuthBackdrop><SafeAreaView style={{ flex: 1 }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={{ alignItems: 'center', marginBottom: 23 }}><VexluneLogo size={62} /><Text style={{ color: authColors.ink, fontSize: 29, fontWeight: '900', marginTop: 12 }}>加入 Vexlune Hub</Text><Text style={{ color: authColors.ink, fontSize: 15, letterSpacing: 5, marginTop: 4 }}>创建你的 AI 工作台</Text><Text style={{ color: authColors.subtext, fontSize: 13, letterSpacing: 1.5, marginTop: 11 }}>从邮箱开始，连接智能服务</Text></View>
    <View style={{ backgroundColor: '#FFFFFFD9', borderRadius: 26, borderWidth: 1, borderColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 21, paddingBottom: 19, shadowColor: '#7189B8', shadowOpacity: 0.12, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 5 }}>
      <AuthTabs />
      <AuthField icon={<Mail color={authColors.subtext} size={20} />} label="邮箱地址" helper="请输入用于登录的邮箱"><TextInput accessibilityLabel="register-email" value={email} onChangeText={(value) => { setEmail(value); setError(''); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="name@example.com" placeholderTextColor={authColors.faint} style={{ flex: 1, color: authColors.ink, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15 }} /></AuthField>
      <AuthField icon={<LockKeyhole color={authColors.subtext} size={20} />} label="密码" helper="至少 6 位字符"><TextInput accessibilityLabel="register-password" value={password} onChangeText={(value) => { setPassword(value); setError(''); }} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} placeholder="设置登录密码" placeholderTextColor={authColors.faint} style={{ flex: 1, color: authColors.ink, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15 }} /><Pressable accessibilityLabel="toggle-register-password" onPress={() => setShowPassword((value) => !value)} style={{ padding: 13 }}>{showPassword ? <EyeOff color={authColors.subtext} size={19} /> : <Eye color={authColors.subtext} size={19} />}</Pressable></AuthField>
      <AuthField icon={<LockKeyhole color={authColors.subtext} size={20} />} label="确认密码" helper="再次输入相同密码"><TextInput accessibilityLabel="register-confirm-password" value={confirm} onChangeText={(value) => { setConfirm(value); setError(''); }} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} placeholder="确认登录密码" placeholderTextColor={authColors.faint} style={{ flex: 1, color: authColors.ink, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15 }} /></AuthField>
      {verifyStep ? <AuthField icon={<ShieldCheck color={authColors.subtext} size={20} />} label="邮箱验证码" helper="验证码已发送至你的邮箱"><TextInput accessibilityLabel="register-verify-code" value={verifyCode} onChangeText={(value) => setVerifyCode(value.replace(/\D/g, '').slice(0, 8))} keyboardType="number-pad" placeholder="请输入验证码" placeholderTextColor={authColors.faint} style={{ flex: 1, color: authColors.ink, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15 }} /></AuthField> : null}
      <TurnstileGate action="register" resetKey={turnstileReset} consentRequestKey={agreementSubmitAttempt} onToken={handleTurnstileToken} onStatus={handleTurnstileStatus} />
      {registrationEnabled === false ? <Text style={{ color: '#A36814', fontSize: 13, lineHeight: 19, marginTop: 13 }}>当前已关闭公开注册，请返回登录或联系管理员。</Text> : null}
      {notice ? <Text style={{ color: '#16825C', fontSize: 13, lineHeight: 19, marginTop: 13 }}>{notice}</Text> : null}
      {error ? <Text style={{ color: authColors.danger, fontSize: 13, lineHeight: 19, marginTop: 13 }}>{error}</Text> : null}
      <View style={{ marginTop: 17 }}><GradientAction label={registrationEnabled === false ? '注册已关闭' : registrationEnabled === null ? '检查注册状态…' : verifyStep ? '完成注册' : '创建账号'} busy={busy} disabled={registrationEnabled !== true} onPress={() => void submit()} /></View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 18 }}><Text style={{ color: authColors.subtext, fontSize: 13 }}>已有账号？</Text><Pressable onPress={() => router.replace('/login')}><Text style={{ color: '#2D63DA', fontSize: 13, fontWeight: '900' }}>返回登录</Text></Pressable></View>
      <LoginAgreementNotice action="register" />
    </View>
    <View style={{ alignItems: 'center', marginTop: 24 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><ShieldCheck color="#7C91B8" size={14} /><Text style={{ color: '#8798BA', fontSize: 11 }}>登录或注册即表示你同意服务条款</Text></View><Text style={{ color: '#8295BA', fontSize: 10, letterSpacing: 4, marginTop: 23 }}>VEXLUNE HUB</Text><Text style={{ color: '#9AA8C4', fontSize: 9, letterSpacing: 2, marginTop: 6 }}>INTELLIGENCE FOR A BRIGHTER TOMORROW</Text></View>
  </ScrollView></KeyboardAvoidingView></SafeAreaView></AuthBackdrop>;
}
