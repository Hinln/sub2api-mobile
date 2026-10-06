/**
 * Formats an identity only from a server-authoritative user object.
 * Admin-Key sessions normally have no user object in official v0.2.13, so the
 * role label is the only truthful fallback.
 */
export type AdminIdentitySource = {
  username?: string | null;
  email?: string | null;
} | null | undefined;

export function formatAdminIdentity(user: AdminIdentitySource) {
  const username = user?.username?.trim();
  if (username) return username;
  const email = user?.email?.trim();
  if (email) return email;
  return '管理员';
}
