import { router } from 'expo-router';
import { ChevronLeft, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminConfigState } from '@/src/store/admin-config';
import {
  changeUserPassword,
  disableTotp,
  enableTotp,
  getTotpStatus,
  getUserProfile,
  initiateTotpSetup,
  sendTotpVerifyCode,
  updateUserProfile,
} from '@/src/services/user';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { theme } from '@/src/theme';
import { useSnapshot } from 'valtio/react';

function Field({ label, value, onChangeText, secure = false, keyboardType = 'default' }: { label: string; value: string; onChangeText: (value: string) => void; secure?: boolean; keyboardType?: 'default' | 'email-address' | 'number-pad' }) {
  return <View style={{ marginTop: 13 }}><Text style={{ color: theme.subtext, fontSize: 12, marginBottom: 7 }}>{label}</Text><TextInput value={value} onChangeText={onChangeText} secureTextEntry={secure} keyboardType={keyboardType} autoCapitalize="none" autoCorrect={false} placeholderTextColor={theme.faint} style={{ color: theme.text, backgroundColor: theme.cardRaised, borderRadius: 13, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 13, paddingVertical: 12 }} /></View>;
}

export default function UserSettingsScreen() {
  const config = useSnapshot(adminConfigState);
  const client = useQueryClient();
  const profile = useQuery({ queryKey: ['user-profile'], queryFn: getUserProfile, enabled: Boolean(config.accessToken) });
  const totp = useQuery({ queryKey: ['user-totp-status'], queryFn: getTotpStatus, enabled: Boolean(config.accessToken) });
  const [username, setUsername] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [totpPassword, setTotpPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [message, setMessage] = useState('');

  const profileUsername = profile.data?.username;
  useEffect(() => { if (profileUsername !== undefined) setUsername(profileUsername ?? ''); }, [profileUsername]);

  const profileMutation = useMutation({
    mutationFn: () => updateUserProfile({ username: username.trim() || null }),
    onSuccess: () => { setMessage('个人资料已保存'); void client.invalidateQueries({ queryKey: ['user-profile'] }); },
  });
  const passwordMutation = useMutation({
    mutationFn: () => changeUserPassword(oldPassword, newPassword),
    onSuccess: () => { setOldPassword(''); setNewPassword(''); setConfirmPassword(''); setMessage('密码已修改，请重新登录其他设备'); },
  });
  const setupMutation = useMutation({
    mutationFn: () => initiateTotpSetup(totpPassword ? { password: totpPassword } : {}),
    onSuccess: (value) => { setSetupToken(value.setup_token); setSecret(value.secret); setQrCodeUrl(value.qr_code_url); setMessage('验证器密钥已生成，请在验证器中添加后输入 6 位验证码'); },
  });
  const enableMutation = useMutation({
    mutationFn: () => enableTotp({ totp_code: totpCode, setup_token: setupToken }),
    onSuccess: () => { setSetupToken(''); setSecret(''); setQrCodeUrl(''); setTotpCode(''); setTotpPassword(''); setMessage('双因素认证已启用'); void client.invalidateQueries({ queryKey: ['user-totp-status'] }); },
  });
  const disableMutation = useMutation({
    mutationFn: () => disableTotp(totpPassword ? { password: totpPassword } : {}),
    onSuccess: () => { setTotpPassword(''); setMessage('双因素认证已停用'); void client.invalidateQueries({ queryKey: ['user-totp-status'] }); },
  });
  const sendCodeMutation = useMutation({ mutationFn: sendTotpVerifyCode, onSuccess: () => setMessage('验证邮件已发送，请查收邮箱') });
  const mutationError = profileMutation.error || passwordMutation.error || setupMutation.error || enableMutation.error || disableMutation.error || sendCodeMutation.error;

  function savePassword() {
    if (!oldPassword || newPassword.length < 6) { setMessage('请输入当前密码和至少 6 位新密码'); return; }
    if (newPassword !== confirmPassword) { setMessage('两次新密码不一致'); return; }
    setMessage(''); passwordMutation.mutate();
  }
  function toggleTotp() {
    if (totp.data?.enabled) {
      Alert.alert('停用双因素认证', '停用后登录安全性会降低，确认继续？', [{ text: '取消', style: 'cancel' }, { text: '停用', style: 'destructive', onPress: () => disableMutation.mutate() }]);
    } else {
      setMessage(''); setupMutation.mutate();
    }
  }

  if (!config.accessToken) return null;
  return <View style={{ flex: 1, backgroundColor: theme.page }}><ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Pressable onPress={() => router.back()} style={{ padding: 8 }}><ChevronLeft color={theme.text} size={22} /></Pressable><View><Text style={{ color: theme.text, fontSize: 25, fontWeight: '900' }}>账户与安全</Text><Text style={{ color: theme.subtext, marginTop: 3 }}>资料、密码和双因素认证</Text></View></View>
    {profile.error || totp.error ? <Text style={{ color: theme.danger }}>{humanizeApiError(profile.error || totp.error)}</Text> : null}
    <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 18, padding: 16 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><KeyRound color={theme.primary} size={18} /><Text style={{ color: theme.text, fontWeight: '900' }}>个人资料</Text></View><Text selectable style={{ color: theme.subtext, fontSize: 12, marginTop: 12 }}>{profile.data?.email || '—'}</Text><Field label="用户名" value={username} onChangeText={setUsername} /><Pressable disabled={profileMutation.isPending} onPress={() => profileMutation.mutate()} style={{ marginTop: 15, borderRadius: 13, backgroundColor: profileMutation.isPending ? theme.muted : theme.primary, paddingVertical: 12, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '900' }}>{profileMutation.isPending ? '保存中…' : '保存资料'}</Text></Pressable></View>
    <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 18, padding: 16 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><LockKeyhole color={theme.primary} size={18} /><Text style={{ color: theme.text, fontWeight: '900' }}>修改密码</Text></View><Field label="当前密码" value={oldPassword} onChangeText={setOldPassword} secure /><Field label="新密码（至少 6 位）" value={newPassword} onChangeText={setNewPassword} secure /><Field label="确认新密码" value={confirmPassword} onChangeText={setConfirmPassword} secure /><Pressable disabled={passwordMutation.isPending} onPress={savePassword} style={{ marginTop: 15, borderRadius: 13, backgroundColor: passwordMutation.isPending ? theme.muted : theme.primary, paddingVertical: 12, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '900' }}>{passwordMutation.isPending ? '提交中…' : '修改密码'}</Text></Pressable></View>
    <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 18, padding: 16 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><ShieldCheck color={theme.primary} size={18} /><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '900' }}>双因素认证</Text><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>{totp.isLoading ? '正在读取服务端状态…' : !totp.data?.feature_enabled ? '服务端当前未启用此功能' : totp.data?.enabled ? '当前已启用' : '当前未启用'}</Text></View></View>{totp.data?.feature_enabled ? <><Field label="当前密码（服务端要求时填写）" value={totpPassword} onChangeText={setTotpPassword} secure /><View style={{ flexDirection: 'row', gap: 8, marginTop: 13 }}><Pressable onPress={() => sendCodeMutation.mutate()} disabled={sendCodeMutation.isPending} style={{ flex: 1, borderRadius: 12, backgroundColor: theme.cardRaised, paddingVertical: 11, alignItems: 'center' }}><Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>{sendCodeMutation.isPending ? '发送中…' : '发送邮箱验证码'}</Text></Pressable><Pressable onPress={toggleTotp} disabled={setupMutation.isPending || disableMutation.isPending} style={{ flex: 1, borderRadius: 12, backgroundColor: totp.data.enabled ? theme.dangerSoft : theme.primarySoft, paddingVertical: 11, alignItems: 'center' }}><Text style={{ color: totp.data.enabled ? theme.danger : theme.primary, fontSize: 12, fontWeight: '800' }}>{setupMutation.isPending || disableMutation.isPending ? '处理中…' : totp.data.enabled ? '停用' : '开始设置'}</Text></Pressable></View>{setupToken ? <><Text selectable style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 14 }}>请在验证器中添加以下密钥（二维码地址由服务端返回）：</Text><Text selectable style={{ color: theme.text, fontSize: 12, lineHeight: 18, marginTop: 8 }}>{secret}</Text><Text selectable style={{ color: theme.faint, fontSize: 11, lineHeight: 16, marginTop: 6 }}>{qrCodeUrl}</Text><Field label="验证器 6 位验证码" value={totpCode} onChangeText={(value) => setTotpCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" /><Pressable disabled={enableMutation.isPending || !/^\d{6}$/.test(totpCode)} onPress={() => enableMutation.mutate()} style={{ marginTop: 13, borderRadius: 12, backgroundColor: enableMutation.isPending || !/^\d{6}$/.test(totpCode) ? theme.muted : theme.primary, paddingVertical: 11, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '900' }}>{enableMutation.isPending ? '验证中…' : '启用双因素认证'}</Text></Pressable></> : null}</> : null}</View>
    {message ? <Text style={{ color: mutationError ? theme.danger : theme.success, lineHeight: 19 }}>{mutationError ? humanizeApiError(mutationError) : message}</Text> : mutationError ? <Text style={{ color: theme.danger, lineHeight: 19 }}>{humanizeApiError(mutationError)}</Text> : null}
    <Text style={{ color: theme.faint, fontSize: 11, lineHeight: 17 }}>账户权限、密码和双因素认证均由 Vexlune Hub 服务端校验；本页面不保存密码或 TOTP secret。</Text>
  </ScrollView></View>;
}
