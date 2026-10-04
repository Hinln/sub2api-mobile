import { router } from 'expo-router';
import { AlertTriangle, BookOpen, CircleDollarSign, KeyRound, Layers3, LogOut, Megaphone, ServerCog, Settings2, ShieldAlert, ShieldCheck, UserRound } from 'lucide-react-native';
import { Alert, Pressable, Text, View } from 'react-native';
import { useSnapshot } from 'valtio/react';

import { Card, MenuRow, Page, SectionTitle } from '@/src/components/ui';
import { VEXLUNE_API_URL, VEXLUNE_HUB_URL } from '@/src/config/vexlune';
import { queryClient } from '@/src/lib/query-client';
import { logoutRemote } from '@/src/services/auth';
import { adminConfigState, logoutAdminAccount } from '@/src/store/admin-config';
import { isAdmin, setWorkspaceMode } from '@/src/auth/session';
import { theme } from '@/src/theme';

function ManagementTile({ icon: Icon, title, subtitle, onPress, tone = 'primary' }: { icon: typeof UserRound; title: string; subtitle: string; onPress: () => void; tone?: 'primary' | 'warning' | 'danger' }) {
  const color = tone === 'danger' ? theme.danger : tone === 'warning' ? theme.warning : theme.primary;
  const background = tone === 'danger' ? theme.dangerSoft : tone === 'warning' ? theme.warningSoft : theme.primarySoft;
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ width: '48%', minHeight: 104, borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: pressed ? theme.muted : theme.card, padding: 14, opacity: pressed ? 0.86 : 1 })}>
    <View style={{ width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: background }}><Icon size={17} color={color} /></View>
    <Text numberOfLines={1} style={{ color: theme.text, fontSize: 13, fontWeight: '900', marginTop: 11 }}>{title}</Text>
    <Text numberOfLines={2} style={{ color: theme.subtext, fontSize: 10, lineHeight: 15, marginTop: 4 }}>{subtitle}</Text>
  </Pressable>;
}

export default function MoreScreen() {
  const config = useSnapshot(adminConfigState);

  function logout() {
    Alert.alert('\u9000\u51fa\u767b\u5f55', '\u5c06\u6e05\u9664\u672c\u673a\u7ba1\u7406\u5458\u51ed\u636e\u548c\u7f13\u5b58\u6570\u636e\u3002', [
      { text: '\u53d6\u6d88', style: 'cancel' },
      { text: '\u786e\u8ba4\u9000\u51fa', style: 'destructive', onPress: () => void logoutRemote().catch(() => undefined).finally(async () => { await logoutAdminAccount(); queryClient.clear(); router.replace('/login'); }) },
    ]);
  }

  return (
    <Page title={'\u66f4\u591a'} subtitle={'\u914d\u7f6e\u3001\u5b89\u5168\u4e0e\u8f85\u52a9\u7ba1\u7406\u529f\u80fd'}>
      <Card style={{ padding: 18, backgroundColor: theme.card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primarySoft }}><UserRound color={theme.primary} size={22} /></View>
          <View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>{config.user?.username || config.user?.email || '管理员'}</Text><Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>{config.user?.email || '已连接 Vexlune Hub'}</Text></View>
          <View style={{ borderRadius: 999, backgroundColor: theme.successSoft, paddingHorizontal: 9, paddingVertical: 5 }}><Text style={{ color: theme.success, fontSize: 10, fontWeight: '900' }}>ADMIN</Text></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}><View style={{ flex: 1, borderRadius: 12, backgroundColor: theme.cardRaised, padding: 10 }}><Text style={{ color: theme.faint, fontSize: 10 }}>Hub 地址</Text><Text numberOfLines={1} style={{ color: theme.text, fontSize: 11, fontWeight: '800', marginTop: 4 }}>{VEXLUNE_HUB_URL}</Text></View><View style={{ flex: 1, borderRadius: 12, backgroundColor: theme.cardRaised, padding: 10 }}><Text style={{ color: theme.faint, fontSize: 10 }}>模型 API</Text><Text numberOfLines={1} style={{ color: theme.text, fontSize: 11, fontWeight: '800', marginTop: 4 }}>{VEXLUNE_API_URL}</Text></View></View>
      </Card>
      <SectionTitle title={'管理工具'} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }}>
        {isAdmin(config.user) ? <ManagementTile icon={UserRound} title={'我的工作台'} subtitle={'个人额度与密钥'} onPress={() => { setWorkspaceMode('user'); router.replace('/user'); }} /> : null}
        <ManagementTile icon={AlertTriangle} title={'异常中心'} subtitle={'失败请求与账号异常'} tone="danger" onPress={() => router.push('/exceptions')} />
        <ManagementTile icon={Layers3} title={'分组与模型'} subtitle={'分组状态与倍率'} onPress={() => router.push('/groups')} />
        <ManagementTile icon={KeyRound} title={'API Key'} subtitle={'用户密钥与配额'} onPress={() => router.push('/users')} />
        <ManagementTile icon={Megaphone} title={'公告通知'} subtitle={'发布与阅读范围'} onPress={() => router.push('/admin-announcements')} />
        <ManagementTile icon={CircleDollarSign} title={'订单资金'} subtitle={'履约与退款审计'} tone="warning" onPress={() => router.push('/admin-orders')} />
        <ManagementTile icon={ShieldAlert} title={'审计告警'} subtitle={'记录与处理状态'} tone="danger" onPress={() => router.push('/admin-security')} />
        <ManagementTile icon={ServerCog} title={'连接安全'} subtitle={'地址与生物识别'} onPress={() => router.push('/settings')} />
      </View>
      <SectionTitle title={'应用'} />
      <Card style={{ paddingVertical: 4 }}>
        <MenuRow icon={ShieldCheck} title={'安全设计'} subtitle={'凭据保存与权限说明'} onPress={() => router.push('/about')} />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <MenuRow icon={BookOpen} title={'关于与开源许可'} subtitle="Vexlune Mobile Console 1.0.1" onPress={() => router.push('/about')} />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <MenuRow icon={Settings2} title={'系统设置'} subtitle={'显示与连接配置'} onPress={() => router.push('/settings')} />
      </Card>
      <Pressable accessibilityRole="button" onPress={logout} style={({ pressed }) => ({ minHeight: 52, marginTop: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.dangerSoft, backgroundColor: pressed ? theme.dangerSoft : theme.card, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><LogOut color={theme.danger} size={17} /><Text style={{ color: theme.danger, fontSize: 13, fontWeight: '900' }}>退出管理员账号</Text></View></Pressable>
    </Page>
  );
}
