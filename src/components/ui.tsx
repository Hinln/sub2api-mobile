import { ChartNoAxesCombined, Home, Settings2, UserRound, Users, type LucideIcon } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { router, usePathname } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { VexluneLogo } from '@/src/components/vexlune-logo';
import { sessionState } from '@/src/auth/session';
import { formatAdminIdentity } from '@/src/lib/admin-identity';
import { humanizeApiError } from '@/src/lib/admin-fetch';
import { listUsers } from '@/src/services/admin';
import { theme } from '@/src/theme';

export function Page({ title, subtitle, children, refreshing = false, onRefresh, right }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  right?: ReactNode;
}) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  // Official Admin Key validation intentionally returns only key status and a
  // masked key, not an administrator profile. If a JWT-backed session ever
  // supplies a verified username/email, prefer it; otherwise keep the honest
  // role label instead of inventing an identity.
  const hasAdminKey = Boolean(sessionState.adminApiKey?.trim());
  const identityQuery = useQuery({
    queryKey: ['admin-identity', hasAdminKey],
    queryFn: () => listUsers('', { page: 1, page_size: 1, status: 'active', role: 'admin', sort: 'id', order: 'asc' }),
    enabled: hasAdminKey && !sessionState.user,
    staleTime: 5 * 60_000,
    retry: false,
  });
  // Admin-Key middleware resolves the first active administrator by ID. The
  // matching read-only list query is the only official way for this client to
  // display that server-authoritative identity; failures keep the honest role
  // label instead of guessing from the key.
  const adminIdentity = formatAdminIdentity(sessionState.user ?? identityQuery.data?.items?.[0]);
  // Routes declared inside the tabs navigator already receive the native
  // The four primary routes use the native tab bar. Secondary management
  // routes keep the same four-item bar via this Page shell after their native
  // tab bar is hidden in the tab navigator.
  const tabRoutes = ['/', '/monitor', '/users', '/settings'];
  const standalone = !tabRoutes.includes(pathname);
  const activePath = pathname === '/' ? '/' : pathname.startsWith('/monitor') ? '/monitor' : pathname.startsWith('/users') ? '/users' : pathname.startsWith('/settings') ? '/settings' : '/settings';
  const navItems = [
    { path: '/', label: '首页', Icon: Home },
    { path: '/monitor', label: '监控', Icon: ChartNoAxesCombined },
    { path: '/users', label: '用户', Icon: Users },
    { path: '/settings', label: '设置', Icon: Settings2 },
  ] as const;
  return (
    <SafeAreaView edges={standalone ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.page }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: -110, right: -120, width: 300, height: 300, borderRadius: 150, backgroundColor: theme.primarySoft, opacity: 0.58 }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 240, left: -190, width: 360, height: 360, borderRadius: 180, backgroundColor: '#DFF4FF', opacity: 0.48 }} />
      <ScrollView
        style={{ flex: 1 }}
        // Native tab routes already reserve the system/tab-bar area. A large
        // fixed bottom inset here created a second blank band above the tab
        // bar. Secondary routes render the custom bar below and still need
        // enough scroll room to reveal their last controls.
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: standalone ? 96 + insets.bottom : 28 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} /> : undefined}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1 }}>
            <VexluneLogo size={48} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 21, fontWeight: '900', letterSpacing: -0.4 }}>Vexlune Hub</Text>
              <Text numberOfLines={1} style={{ color: theme.text, fontSize: 18, lineHeight: 23, fontWeight: '800', marginTop: 2 }}>{title}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginLeft: 10 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}><UserRound color={theme.primary} size={21} /></View>
            <View><Text numberOfLines={1} style={{ maxWidth: 132, color: theme.text, fontSize: 11, fontWeight: '900' }}>{adminIdentity}</Text><Text style={{ color: theme.subtext, fontSize: 10, marginTop: 2 }}>{hasAdminKey ? 'Admin Key · 已连接' : '管理端已连接'}</Text></View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <Text style={{ flex: 1, color: theme.subtext, fontSize: 12, lineHeight: 18 }}>{subtitle || '管理员专用 · 真实服务端数据'}</Text>
          {right ? <View style={{ alignItems: 'flex-end' }}>{right}</View> : null}
        </View>
        {children}
      </ScrollView>
      {standalone ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 7, paddingBottom: Math.max(12, insets.bottom) }}>
        {navItems.map((item) => {
          const selected = activePath === item.path;
          const Icon = item.Icon;
          return <Pressable key={item.path} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => router.replace(item.path)} style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, marginHorizontal: 3, borderRadius: 18, backgroundColor: selected ? theme.primarySoft : 'transparent' }}>
            <Icon color={selected ? theme.primary : theme.faint} size={23} strokeWidth={selected ? 2.5 : 2} />
            <Text style={{ color: selected ? theme.primary : theme.faint, fontSize: 12, fontWeight: selected ? '900' : '700' }}>{item.label}</Text>
          </Pressable>;
        })}
      </View> : null}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[{ backgroundColor: theme.card, borderRadius: 22, borderWidth: 1, borderColor: '#E5ECF8', padding: 16, shadowColor: '#7C95C7', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 2 }, style]}>{children}</View>;
}

export function StateCard({ loading, error, empty, onRetry, emptyText }: {
  loading?: boolean;
  error?: unknown;
  empty?: boolean;
  onRetry?: () => void;
  emptyText?: string;
}) {
  if (!loading && !error && !empty) return null;
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', marginTop: loading ? 14 : 0 }}>
        {loading ? '\u6b63\u5728\u52a0\u8f7d' : error ? '\u52a0\u8f7d\u5931\u8d25' : '\u6682\u65e0\u6570\u636e'}
      </Text>
      <Text style={{ color: error ? theme.danger : theme.subtext, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 }}>
        {error ? humanizeApiError(error) : emptyText || '\u5f53\u524d\u7b5b\u9009\u6761\u4ef6\u4e0b\u6ca1\u6709\u8bb0\u5f55\u3002'}
      </Text>
      {onRetry && error ? <Pressable onPress={onRetry} style={{ marginTop: 16, borderRadius: 14, backgroundColor: theme.primary, paddingHorizontal: 20, paddingVertical: 11 }}><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{'\u91cd\u8bd5'}</Text></Pressable> : null}
    </Card>
  );
}

/**
 * Keeps already-rendered server data visible when a background refresh fails.
 * A refetch error is a degraded refresh, not a reason to replace a usable
 * workspace with a full-screen error card.
 */
export function RefreshError({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  if (!error) return null;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12, borderRadius: 14, backgroundColor: theme.warningSoft, borderWidth: 1, borderColor: '#F7DFA5', paddingHorizontal: 12, paddingVertical: 10 }}>
    <Text numberOfLines={2} style={{ flex: 1, color: theme.warning, fontSize: 11, lineHeight: 16 }}>{`刷新失败：${humanizeApiError(error)}。已保留上次成功数据。`}</Text>
    {onRetry ? <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8} style={{ paddingHorizontal: 4, paddingVertical: 2 }}><Text style={{ color: theme.warning, fontSize: 11, fontWeight: '900' }}>重试</Text></Pressable> : null}
  </View>;
}

export function Metric({ label, value, tone = 'default', icon: Icon, trend }: { label: string; value: string; tone?: 'default' | 'success' | 'danger' | 'warning'; icon?: LucideIcon; trend?: string }) {
  const color = tone === 'success' ? theme.success : tone === 'danger' ? theme.danger : tone === 'warning' ? theme.warning : theme.text;
  return (
    <View style={{ minWidth: 0, flex: 1, backgroundColor: theme.cardRaised, borderRadius: 16, padding: 13 }}>
      {Icon ? <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: tone === 'success' ? theme.successSoft : tone === 'warning' ? theme.warningSoft : theme.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><Icon color={tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : theme.primary} size={15} /></View> : null}
      <Text style={{ color: theme.subtext, fontSize: 11 }}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color, fontSize: 20, fontWeight: '900', marginTop: 7 }}>{value}</Text>
      {trend ? <Text numberOfLines={1} style={{ color: trend.startsWith('-') ? theme.danger : theme.success, fontSize: 10, fontWeight: '800', marginTop: 5 }}>{trend}</Text> : null}
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 10 }}><Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>{title}</Text>{typeof action === 'string' ? <Text style={{ color: theme.subtext, fontSize: 12 }}>{action}</Text> : action}</View>;
}

export function Badge({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'success' | 'danger' | 'warning' | 'primary' }) {
  const palette = tone === 'success' ? [theme.successSoft, theme.success] : tone === 'danger' ? [theme.dangerSoft, theme.danger] : tone === 'warning' ? [theme.warningSoft, theme.warning] : tone === 'primary' ? [theme.primarySoft, theme.primary] : [theme.muted, theme.subtext];
  return <View style={{ borderRadius: 999, backgroundColor: palette[0], paddingHorizontal: 9, paddingVertical: 5 }}><Text style={{ color: palette[1], fontSize: 10, fontWeight: '800' }}>{label}</Text></View>;
}

export function MenuRow({ icon: Icon, title, subtitle, onPress, danger = false }: { icon: LucideIcon; title: string; subtitle?: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14 }}>
      <View style={{ width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? theme.dangerSoft : theme.primarySoft }}><Icon size={19} color={danger ? theme.danger : theme.primary} /></View>
      <View style={{ flex: 1 }}><Text style={{ color: danger ? theme.danger : theme.text, fontWeight: '800' }}>{title}</Text>{subtitle ? <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>{subtitle}</Text> : null}</View>
      <Text style={{ color: theme.faint, fontSize: 20 }}>{'\u203a'}</Text>
    </Pressable>
  );
}
