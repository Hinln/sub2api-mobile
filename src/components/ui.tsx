import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { humanizeApiError } from '@/src/lib/admin-fetch';
import { theme } from '@/src/theme';

export function Page({ title, subtitle, children, refreshing = false, onRefresh, right }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  right?: ReactNode;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 112 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} /> : undefined}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 28, lineHeight: 34, fontWeight: '900' }}>{title}</Text>
            {subtitle ? <Text style={{ color: theme.subtext, fontSize: 13, lineHeight: 20, marginTop: 5 }}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[{ backgroundColor: theme.card, borderRadius: 20, borderWidth: 1, borderColor: theme.border, padding: 16, shadowColor: '#25163D', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.045, shadowRadius: 14, elevation: 2 }, style]}>{children}</View>;
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

export function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'success' | 'danger' | 'warning' }) {
  const color = tone === 'success' ? theme.success : tone === 'danger' ? theme.danger : tone === 'warning' ? theme.warning : theme.text;
  return (
    <View style={{ minWidth: 0, flex: 1, backgroundColor: theme.cardRaised, borderRadius: 16, padding: 13 }}>
      <Text style={{ color: theme.subtext, fontSize: 11 }}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color, fontSize: 20, fontWeight: '900', marginTop: 7 }}>{value}</Text>
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 10 }}><Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>{title}</Text>{action}</View>;
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
