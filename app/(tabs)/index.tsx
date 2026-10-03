import { Redirect } from 'expo-router';
import { adminConfigState, hasAuthenticatedAdminSession } from '@/src/store/admin-config';
import { isAdmin } from '@/src/auth/session';

// CommonJS entry avoids import.meta in Expo Metro's classic web bundle.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useSnapshot } = require('valtio/react');

export default function IndexScreen() {
  const config = useSnapshot(adminConfigState);
  const hasAccount = hasAuthenticatedAdminSession(config);

  if (isAdmin(config.user) && config.workspaceMode === 'user') return <Redirect href="/user" />;
  return <Redirect href={hasAccount ? '/monitor' : '/login'} />;
}
