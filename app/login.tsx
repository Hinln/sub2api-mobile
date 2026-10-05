import { Redirect, router } from 'expo-router';
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { AuthBackdrop } from '@/src/components/auth-backdrop';
import { VexluneLogo } from '@/src/components/vexlune-logo';
import { acceptAdminCompliance, getAdminComplianceStatus, validateAdminApiKey, type AdminComplianceStatus } from '@/src/services/admin-auth';
import { hasAuthenticatedAdminSession, adminConfigState } from '@/src/store/admin-config';

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
  danger: '#C73D53',
};

function GradientAction({ label, busy, disabled, onPress }: { label: string; busy: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled || busy} onPress={onPress} style={{ height: 56, borderRadius: 17, overflow: 'hidden', opacity: disabled ? 0.62 : 1 }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute' }}>
        <Defs><SvgLinearGradient id="adminKeyButton" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#B492FF" /><Stop offset="0.52" stopColor="#6D7CF4" /><Stop offset="1" stopColor="#68D7F0" /></SvgLinearGradient></Defs>
        <Rect x="0" y="0" width="100" height="100" rx="17" fill="url(#adminKeyButton)" />
      </Svg>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 11 }}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '900' }}>{label}</Text>}
        {!busy ? <ArrowRight color="#FFFFFF" size={21} strokeWidth={2.2} /> : null}
      </View>
    </Pressable>
  );
}

export default function LoginScreen() {
  const config = useSnapshot(adminConfigState);
  const [adminKey, setAdminKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [complianceKey, setComplianceKey] = useState('');
  const [compliance, setCompliance] = useState<AdminComplianceStatus | null>(null);
  const [complianceConfirmed, setComplianceConfirmed] = useState(false);

  if (hasAuthenticatedAdminSession(config) && !busy) return <Redirect href="/monitor" />;

  function errorMessage(reason: unknown) {
    const candidate = reason as { status?: unknown; code?: unknown; message?: unknown } | null;
    const status = Number(candidate?.status ?? 0);
    const code = String(candidate?.code ?? '').toUpperCase();
    if (status === 401 || code === 'INVALID_ADMIN_KEY' || code === '401') return 'Admin Key 无效或已被撤销，请检查后重试。';
    if (status === 423 || code === 'ADMIN_COMPLIANCE_ACK_REQUIRED') return '管理员合规确认尚未完成，请先在管理后台完成确认。';
    if (status === 403 || code === 'FORBIDDEN') return '此 Admin Key 没有管理员权限。';
    if (status === 429 || code === 'RATE_LIMITED') return '尝试次数过多，请稍后再试。';
    if (candidate?.message === 'REQUEST_TIMEOUT') return '服务器响应较慢，请检查网络连接后重试。';
    if (typeof candidate?.message === 'string' && candidate.message.trim()) return candidate.message;
    return '验证失败，请检查网络后重试。';
  }

  async function submit() {
    if (busy) return;
    const key = adminKey.trim();
    setError('');
    if (!key) { setError('请输入 Admin Key'); return; }
    setBusy(true);
    try {
      // Validate with the official admin route before persisting the credential.
      // The helper sends x-api-key directly; it never places the key in a URL
      // or logs it. A successful response proves this is an active admin key.
      await validateAdminApiKey(key);
      router.replace('/monitor');
    } catch (reason) {
      if (Number((reason as { status?: unknown })?.status ?? 0) === 423 || String((reason as { code?: unknown })?.code ?? '').toUpperCase() === 'ADMIN_COMPLIANCE_ACK_REQUIRED') {
        try {
          const status = await getAdminComplianceStatus(key);
          if (status.required !== false) {
            setComplianceKey(key);
            setCompliance(status);
            setComplianceConfirmed(false);
          } else {
            await validateAdminApiKey(key);
            router.replace('/monitor');
          }
        } catch (complianceError) {
          setError(errorMessage(complianceError));
        }
      } else {
      setError(errorMessage(reason));
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirmCompliance() {
    if (busy || !complianceKey || !compliance || !complianceConfirmed) return;
    setBusy(true);
    setError('');
    try {
      await acceptAdminCompliance(complianceKey, compliance.ack_phrase_zh || '', 'zh');
      await validateAdminApiKey(complianceKey);
      setComplianceKey('');
      setCompliance(null);
      router.replace('/monitor');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return <AuthBackdrop>
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: 'center', marginBottom: 23 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 15 }}><Sparkles color="#8C7DF7" size={14} /><Text style={{ color: '#7D8DB5', fontSize: 12, letterSpacing: 1 }}>安全、清晰、随时掌控</Text></View>
            <VexluneLogo size={62} />
            <Text style={{ color: authColors.ink, fontSize: 31, fontWeight: '900', letterSpacing: 0.2, marginTop: 12 }}>Vexlune Hub</Text>
            <Text style={{ color: authColors.ink, fontSize: 16, letterSpacing: 8, marginTop: 4 }}>管理控制台</Text>
            <Text style={{ color: authColors.subtext, fontSize: 13, letterSpacing: 2, marginTop: 11 }}>管理员专用 · 真实服务端数据</Text>
          </View>

          <View style={{ backgroundColor: '#FFFFFFD9', borderRadius: 26, borderWidth: 1, borderColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 21, paddingBottom: 19, shadowColor: '#7189B8', shadowOpacity: 0.12, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 5 }}>
            {compliance ? <>
              <Text style={{ color: authColors.ink, fontSize: 22, fontWeight: '900' }}>管理员合规确认</Text>
              <Text style={{ color: authColors.subtext, fontSize: 13, lineHeight: 20, marginTop: 8 }}>服务器要求管理员先确认当前运营合规承诺，确认后才会开放管理接口。</Text>
              <Pressable accessibilityRole="link" onPress={() => { const url = compliance.document_url_zh || compliance.document_url_en; if (url) void Linking.openURL(url); }} style={{ marginTop: 15 }}><Text style={{ color: '#2D63DA', fontSize: 13, fontWeight: '800' }}>打开官方合规文档</Text></Pressable>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: complianceConfirmed }} onPress={() => setComplianceConfirmed((value) => !value)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 18 }}>
                <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 1, borderColor: complianceConfirmed ? authColors.primary : authColors.line, backgroundColor: complianceConfirmed ? authColors.primary : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>{complianceConfirmed ? <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>✓</Text> : null}</View>
                <Text style={{ flex: 1, color: authColors.ink, fontSize: 13, lineHeight: 20 }}>我已阅读、理解并同意 Sub2API 部署与运营合规承诺</Text>
              </Pressable>
              {error ? <Text accessibilityLiveRegion="polite" style={{ color: authColors.danger, fontSize: 13, lineHeight: 19, marginTop: 14 }}>{error}</Text> : null}
              <View style={{ marginTop: 18 }}><GradientAction label="确认并进入控制台" busy={busy} disabled={!complianceConfirmed} onPress={() => void confirmCompliance()} /></View>
              <Pressable onPress={() => { setCompliance(null); setComplianceKey(''); setComplianceConfirmed(false); setError(''); }} style={{ alignItems: 'center', paddingTop: 16 }}><Text style={{ color: authColors.primary, fontWeight: '800', fontSize: 13 }}>返回输入 Admin Key</Text></Pressable>
            </> : <>
            <Text style={{ color: authColors.ink, fontSize: 22, fontWeight: '900' }}>管理员登录</Text>
            <Text style={{ color: authColors.subtext, fontSize: 13, lineHeight: 20, marginTop: 8 }}>使用官方 Sub2API Admin Key 进入控制台。</Text>

            <View style={{ marginTop: 21 }}>
              <Text style={{ color: authColors.ink, fontSize: 13, fontWeight: '800', marginBottom: 7 }}>Admin Key</Text>
              <View style={{ minHeight: 56, borderRadius: 16, borderWidth: 1, borderColor: error ? authColors.danger : authColors.line, backgroundColor: authColors.field, flexDirection: 'row', alignItems: 'center', paddingLeft: 15 }}>
                <KeyRound color={authColors.subtext} size={20} />
                <TextInput accessibilityLabel="admin-api-key" value={adminKey} onChangeText={(value) => { setAdminKey(value); setError(''); }} autoCapitalize="none" autoCorrect={false} secureTextEntry={!showKey} textContentType="password" placeholder="admin-••••••••" placeholderTextColor={authColors.faint} onSubmitEditing={() => void submit()} style={{ flex: 1, color: authColors.ink, paddingHorizontal: 12, paddingVertical: 15, fontSize: 15, letterSpacing: 0.4 }} />
                <Pressable accessibilityLabel="toggle-admin-key" onPress={() => setShowKey((value) => !value)} style={{ padding: 13 }}>{showKey ? <EyeOff color={authColors.subtext} size={19} /> : <Eye color={authColors.subtext} size={19} />}</Pressable>
              </View>
              <Text style={{ color: authColors.subtext, fontSize: 11, lineHeight: 17, marginTop: 6 }}>凭据仅保存在本机安全存储，并通过 HTTPS 发送到官方管理接口。</Text>
            </View>

            {error ? <Text accessibilityLiveRegion="polite" style={{ color: authColors.danger, fontSize: 13, lineHeight: 19, marginTop: 14 }}>{error}</Text> : null}
            <View style={{ marginTop: 18 }}><GradientAction label="进入管理控制台" busy={busy} disabled={!adminKey.trim()} onPress={() => void submit()} /></View>
            </>}
          </View>

          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><ShieldCheck color="#7C91B8" size={14} /><Text style={{ color: '#8798BA', fontSize: 11 }}>端到端加密 · 管理员专用</Text></View>
            <Text style={{ color: '#8295BA', fontSize: 10, letterSpacing: 4, marginTop: 23 }}>VEXLUNE HUB</Text>
            <Text style={{ color: '#9AA8C4', fontSize: 9, letterSpacing: 2, marginTop: 6 }}>ADMINISTRATOR CONSOLE</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </AuthBackdrop>;
}
