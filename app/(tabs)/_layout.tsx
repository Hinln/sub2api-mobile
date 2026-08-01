import { Redirect, Tabs } from 'expo-router';
import { Activity, ChartNoAxesCombined, KeyRound, Menu, Users } from 'lucide-react-native';
import { adminConfigState, hasAuthenticatedAdminSession } from '@/src/store/admin-config';
import { theme } from '@/src/theme';

// CommonJS entry avoids import.meta in Expo Metro's classic web bundle.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useSnapshot } = require('valtio/react');

export default function TabsLayout() {
  const config = useSnapshot(adminConfigState);
  if (!hasAuthenticatedAdminSession(config)) return <Redirect href="/login" />;

  return (
    <Tabs
      initialRouteName="monitor"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.faint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border, height: 82, paddingTop: 8, paddingBottom: 18 },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="monitor" options={{ title: '\u6982\u89c8', tabBarIcon: ({ color, size }) => <ChartNoAxesCombined color={color} size={size} /> }} />
      <Tabs.Screen name="users" options={{ title: '\u7528\u6237', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }} />
      <Tabs.Screen name="accounts" options={{ title: '\u8d26\u53f7', tabBarIcon: ({ color, size }) => <KeyRound color={color} size={size} /> }} />
      <Tabs.Screen name="logs" options={{ title: '\u65e5\u5fd7', tabBarIcon: ({ color, size }) => <Activity color={color} size={size} /> }} />
      <Tabs.Screen name="more" options={{ title: '\u66f4\u591a', tabBarIcon: ({ color, size }) => <Menu color={color} size={size} /> }} />
      <Tabs.Screen name="groups" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
