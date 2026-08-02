import { router } from 'expo-router';
import { AlertTriangle, BookOpen, KeyRound, Layers3, LogOut, ServerCog, Settings2, ShieldCheck } from 'lucide-react-native';
import { Alert, Text, View } from 'react-native';

import { Card, MenuRow, Page, SectionTitle } from '@/src/components/ui';
import { VEXLUNE_API_URL, VEXLUNE_HUB_URL } from '@/src/config/vexlune';
import { queryClient } from '@/src/lib/query-client';
import { logoutAdminAccount } from '@/src/store/admin-config';
import { theme } from '@/src/theme';

export default function MoreScreen() {
  function logout() {
    Alert.alert('\u9000\u51fa\u767b\u5f55', '\u5c06\u6e05\u9664\u672c\u673a\u7ba1\u7406\u5458\u51ed\u636e\u548c\u7f13\u5b58\u6570\u636e\u3002', [
      { text: '\u53d6\u6d88', style: 'cancel' },
      { text: '\u786e\u8ba4\u9000\u51fa', style: 'destructive', onPress: () => void logoutAdminAccount().then(() => { queryClient.clear(); router.replace('/login'); }) },
    ]);
  }

  return (
    <Page title={'\u66f4\u591a'} subtitle={'\u914d\u7f6e\u3001\u5b89\u5168\u4e0e\u8f85\u52a9\u7ba1\u7406\u529f\u80fd'}>
      <Card><View><Text style={{ color: theme.faint, fontSize: 11 }}>{'\u7ba1\u7406\u64cd\u4f5c'}</Text><Text style={{ color: theme.text, fontSize: 13, marginTop: 5 }}>{VEXLUNE_HUB_URL}</Text><Text style={{ color: theme.faint, fontSize: 11, marginTop: 12 }}>{'\u6a21\u578b API\uff08\u4ec5\u5c55\u793a\uff09'}</Text><Text style={{ color: theme.text, fontSize: 13, marginTop: 5 }}>{VEXLUNE_API_URL}</Text></View></Card>
      <SectionTitle title={'\u7ba1\u7406'} />
      <Card>
        <MenuRow icon={AlertTriangle} title={'\u5f02\u5e38\u4e2d\u5fc3'} subtitle={'\u805a\u5408\u6700\u8fd1\u5931\u8d25\u4e0e\u5f53\u524d\u9875\u8d26\u53f7\u5f02\u5e38'} onPress={() => router.push('/exceptions')} />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <MenuRow icon={Layers3} title={'\u5206\u7ec4\u4e0e\u6a21\u578b'} subtitle={'\u5206\u7ec4\u72b6\u6001\u3001\u8d26\u53f7\u6570\u4e0e\u500d\u7387'} onPress={() => router.push('/groups')} />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <MenuRow icon={KeyRound} title="API Key" subtitle={'\u6309\u7528\u6237\u67e5\u770b\u5bc6\u94a5\u3001\u914d\u989d\u548c\u4f7f\u7528\u60c5\u51b5'} onPress={() => router.push('/users')} />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <MenuRow icon={ServerCog} title={'\u8fde\u63a5\u4e0e\u5b89\u5168'} subtitle={'Token\u3001\u751f\u7269\u8bc6\u522b\u4e0e\u9ad8\u7ea7\u5730\u5740'} onPress={() => router.push('/settings')} />
      </Card>
      <SectionTitle title={'\u5e94\u7528'} />
      <Card>
        <MenuRow icon={ShieldCheck} title={'\u5b89\u5168\u8bbe\u8ba1'} subtitle={'\u51ed\u636e\u4fdd\u5b58\u4e0e\u6743\u9650\u8bf4\u660e'} onPress={() => router.push('/about')} />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <MenuRow icon={BookOpen} title={'\u5173\u4e8e\u4e0e\u5f00\u6e90\u8bb8\u53ef'} subtitle="Vexlune Mobile Console 1.0.1" onPress={() => router.push('/about')} />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <MenuRow icon={Settings2} title={'\u7cfb\u7edf\u8bbe\u7f6e'} subtitle={'\u5f53\u524d\u7248\u672c\u4ec5\u5b89\u5168\u5730\u5c55\u793a\u914d\u7f6e\uff0c\u4e0d\u76f2\u76ee\u63d0\u4ea4'} onPress={() => router.push('/settings')} />
      </Card>
      <SectionTitle title={'\u4f1a\u8bdd'} />
      <Card><MenuRow icon={LogOut} title={'\u9000\u51fa\u767b\u5f55'} subtitle={'\u6e05\u9664 SecureStore \u51ed\u636e\u548c\u67e5\u8be2\u7f13\u5b58'} onPress={logout} danger /></Card>
    </Page>
  );
}
