import { router } from 'expo-router';
import {
  AlertTriangle,
  BookOpen,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Layers3,
  LogOut,
  Megaphone,
  ReceiptText,
  Settings2,
  ShieldCheck,
  TicketPercent,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Alert, Pressable, Text, View } from 'react-native';

import { Badge, Card, Page, SectionTitle } from '@/src/components/ui';
import { VEXLUNE_API_URL, VEXLUNE_HUB_URL } from '@/src/config/vexlune';
import { queryClient } from '@/src/lib/query-client';
import { logoutAdminAccount } from '@/src/store/admin-config';
import { theme } from '@/src/theme';

type CapabilityKey = 'finance' | 'orders' | 'plans' | 'coupons' | 'audit' | 'announcements' | 'models';

type MoreItem = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onPress: () => void;
  availability?: 'verified' | 'read-only';
  danger?: boolean;
};

const cardShadow = {
  shadowColor: '#25163D',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.045,
  shadowRadius: 14,
  elevation: 2,
};

function capability(key: CapabilityKey) {
  router.push({ pathname: '/capabilities', params: { module: key } });
}

function MenuSection({ items }: { items: MoreItem[] }) {
  return (
    <Card style={{ paddingVertical: 0, ...cardShadow }}>
      {items.map(({ icon: Icon, title, subtitle, onPress, availability, danger }, index) => (
        <View key={title}>
          {index > 0 ? <View style={{ height: 1, backgroundColor: theme.border }} /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={title}
            onPress={onPress}
            style={({ pressed }) => ({
              minHeight: 72,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 13,
              paddingVertical: 12,
              opacity: pressed ? 0.68 : 1,
            })}
          >
            <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? theme.dangerSoft : theme.primarySoft }}>
              <Icon color={danger ? theme.danger : theme.primary} size={21} strokeWidth={2.1} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: danger ? theme.danger : theme.text, fontSize: 15, fontWeight: '900' }}>{title}</Text>
              <Text numberOfLines={2} style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{subtitle}</Text>
            </View>
            {availability === 'read-only' ? <Badge label="只读" tone="muted" /> : null}
            <ChevronRight color={theme.faint} size={18} />
          </Pressable>
        </View>
      ))}
    </Card>
  );
}

export default function MoreScreen() {
  function logout() {
    Alert.alert('退出登录', '将清除本机管理员凭据和缓存数据。', [
      { text: '取消', style: 'cancel' },
      { text: '确认退出', style: 'destructive', onPress: () => void logoutAdminAccount().then(() => { queryClient.clear(); router.replace('/login'); }) },
    ]);
  }

  const operations: MoreItem[] = [
    { icon: CircleDollarSign, title: '财务中心', subtitle: '支付实收、订单趋势与模型计费分析', availability: 'verified', onPress: () => capability('finance') },
    { icon: ReceiptText, title: '订单管理', subtitle: '充值、订阅订单与支付流水', availability: 'verified', onPress: () => capability('orders') },
    { icon: Boxes, title: '套餐管理', subtitle: '套餐状态、定价、倍率与额度', availability: 'verified', onPress: () => capability('plans') },
    { icon: TicketPercent, title: '优惠码', subtitle: '创建优惠码并查看兑换记录', availability: 'verified', onPress: () => capability('coupons') },
  ];

  const system: MoreItem[] = [
    { icon: FileText, title: '请求日志', subtitle: '查看真实模型调用、Token、耗时与错误', availability: 'verified', onPress: () => router.push('/logs') },
    { icon: AlertTriangle, title: '异常中心', subtitle: '聚合最近失败请求与当前异常账号', availability: 'verified', onPress: () => router.push('/exceptions') },
    { icon: ClipboardList, title: '操作日志', subtitle: '管理员、时间、操作内容、IP 与结果', availability: 'verified', onPress: () => capability('audit') },
    { icon: Megaphone, title: '公告', subtitle: '发布公告并查看用户阅读状态', availability: 'verified', onPress: () => capability('announcements') },
  ];

  const configuration: MoreItem[] = [
    { icon: Layers3, title: '分组管理', subtitle: '查看真实分组状态、平台、倍率与配额', availability: 'verified', onPress: () => router.push('/groups') },
    { icon: Boxes, title: '模型分析', subtitle: '真实请求、Token 与计费排行', availability: 'read-only', onPress: () => capability('models') },
    { icon: ShieldCheck, title: '安全设置', subtitle: '管理员 Token、连接地址与生物识别', availability: 'verified', onPress: () => router.push('/settings?section=security') },
    { icon: Settings2, title: '系统设置', subtitle: 'Hub 版本、应用版本、更新状态与主题', availability: 'verified', onPress: () => router.push('/settings?section=system') },
  ];

  return (
    <Page title="更多" subtitle="配置、安全与运营管理">
      <Card style={{ paddingHorizontal: 18, paddingVertical: 17, ...cardShadow }}>
        <Text style={{ color: theme.faint, fontSize: 11 }}>管理操作</Text>
        <Text selectable style={{ color: theme.text, fontSize: 14, marginTop: 5 }}>{VEXLUNE_HUB_URL}</Text>
        <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 12 }} />
        <Text style={{ color: theme.faint, fontSize: 11 }}>模型 API（仅展示）</Text>
        <Text selectable style={{ color: theme.text, fontSize: 14, marginTop: 5 }}>{VEXLUNE_API_URL}</Text>
      </Card>

      <SectionTitle title="运营" />
      <MenuSection items={operations} />

      <SectionTitle title="系统" />
      <MenuSection items={system} />

      <SectionTitle title="配置" />
      <MenuSection items={configuration} />

      <SectionTitle title="应用" />
      <MenuSection items={[
        { icon: BookOpen, title: '关于 Hub Vexlune', subtitle: '版本、安全边界与开源许可', onPress: () => router.push('/about') },
        { icon: LogOut, title: '退出登录', subtitle: '清除 SecureStore 凭据和查询缓存', danger: true, onPress: logout },
      ]} />
    </Page>
  );
}
