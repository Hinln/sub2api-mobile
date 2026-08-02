import { Redirect, Tabs } from 'expo-router';
import { ChartNoAxesCombined, KeyRound, Menu, Users } from 'lucide-react-native';
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
        sceneStyle: { backgroundColor: theme.page },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.faint,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: { paddingTop: 3 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700', marginTop: 1 },
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 84,
          paddingTop: 8,
          paddingBottom: 17,
          shadowColor: '#1B1230',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 12,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="monitor" options={{ title: '\u6982\u89c8', tabBarIcon: ({ color, size }) => <ChartNoAxesCombined color={color} size={size + 1} strokeWidth={2.25} /> }} />
      <Tabs.Screen name="users" options={{ title: '\u7528\u6237', tabBarIcon: ({ color, size }) => <Users color={color} size={size + 1} strokeWidth={2.25} /> }} />
      <Tabs.Screen name="accounts" options={{ title: '\u8d26\u53f7', tabBarIcon: ({ color, size }) => <KeyRound color={color} size={size + 1} strokeWidth={2.25} /> }} />
      <Tabs.Screen name="more" options={{ title: '\u66f4\u591a', tabBarIcon: ({ color, size }) => <Menu color={color} size={size + 1} strokeWidth={2.25} /> }} />
      <Tabs.Screen name="logs" options={{ href: null }} />
      <Tabs.Screen name="groups" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
