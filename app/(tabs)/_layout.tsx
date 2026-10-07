import { Redirect, Tabs } from 'expo-router';
import { ChartNoAxesCombined, Home, Settings2, Users } from 'lucide-react-native';
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
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.faint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
        tabBarItemStyle: { borderRadius: 18, marginHorizontal: 2, marginVertical: 5 },
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border, height: 82, paddingTop: 4, paddingBottom: 16 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '\u9996\u9875', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="monitor" options={{ title: '\u76d1\u63a7', tabBarIcon: ({ color, size }) => <ChartNoAxesCombined color={color} size={size} /> }} />
      <Tabs.Screen name="users" options={{ title: '\u7528\u6237', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: '\u8bbe\u7f6e', tabBarIcon: ({ color, size }) => <Settings2 color={color} size={size} /> }} />
      <Tabs.Screen name="accounts" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="admin-orders" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="logs" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="more" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="groups" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
