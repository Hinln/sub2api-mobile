import { adminFetch } from '@/src/lib/admin-fetch';
import type {
  AccountTodayStats,
  AdminAccount,
  AdminApiKey,
  AdminGroup,
  AdminSettings,
  AdminUser,
  BalanceOperation,
  DashboardModelStats,
  DashboardSnapshot,
  DashboardStats,
  DashboardTrend,
  CreateAccountRequest,
  CreateGroupRequest,
  CreateUserRequest,
  UpdateGroupRequest,
  AdminAccountModelsResponse,
  AdminProxy,
  PaginatedData,
  PaginationParams,
  SystemVersion,
  UpdateAccountRequest,
  UsageLog,
  UsageStats,
  UserUsageSummary,
} from '@/src/types/admin';

export type AdminRequestError = {
  id: number;
  created_at?: string;
  phase?: string;
  type?: string;
  error_owner?: string;
  error_source?: string;
  severity?: string;
  status_code?: number;
  platform?: string;
  model?: string;
  resolved?: boolean;
  client_request_id?: string;
  request_id?: string;
  message?: string;
  user_email?: string;
  account_name?: string;
  request_path?: string;
  inbound_endpoint?: string;
  upstream_endpoint?: string;
};

export function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const value = query.toString();

  return value ? `?${value}` : '';
}

export function getDashboardStats() {
  return adminFetch<DashboardStats>('/api/v1/admin/dashboard/stats');
}

export function getAdminSettings() {
  return adminFetch<AdminSettings>('/api/v1/admin/settings');
}

export function getDashboardTrend(params: {
  start_date: string;
  end_date: string;
  granularity?: 'day' | 'hour';
  account_id?: number;
  group_id?: number;
  user_id?: number;
}) {
  return adminFetch<DashboardTrend>(`/api/v1/admin/dashboard/trend${buildQuery(params)}`);
}

export function getDashboardModels(params: { start_date: string; end_date: string }) {
  return adminFetch<DashboardModelStats>(`/api/v1/admin/dashboard/models${buildQuery(params)}`);
}

export function getDashboardSnapshot(params: {
  start_date: string;
  end_date: string;
  granularity?: 'day' | 'hour';
  account_id?: number;
  user_id?: number;
  group_id?: number;
  model?: string;
  request_type?: string;
  billing_type?: string | null;
  include_stats?: boolean;
  include_trend?: boolean;
  include_model_stats?: boolean;
  include_group_stats?: boolean;
  include_users_trend?: boolean;
}) {
  return adminFetch<DashboardSnapshot>(`/api/v1/admin/dashboard/snapshot-v2${buildQuery(params)}`);
}

export function getUsageStats(params: {
  start_date: string;
  end_date: string;
  user_id?: number;
  account_id?: number;
  group_id?: number;
  model?: string;
  request_type?: string;
  billing_type?: string | null;
}) {
  return adminFetch<UsageStats>(`/api/v1/admin/usage/stats${buildQuery(params)}`);
}

export function listUsers(search = '', pagination: PaginationParams = {}) {
  return adminFetch<PaginatedData<AdminUser>>(
    `/api/v1/admin/users${buildQuery({ page: pagination.page ?? 1, page_size: pagination.page_size ?? 20, search: search.trim(), status: pagination.status, role: pagination.role, sort_by: pagination.sort, sort_order: pagination.order })}`
  );
}

export function getUser(userId: number) {
  return adminFetch<AdminUser>(`/api/v1/admin/users/${userId}`);
}

export function createUser(body: CreateUserRequest, idempotencyKey?: string) {
  return adminFetch<AdminUser>('/api/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify(body),
  }, { idempotencyKey });
}

export function getUserUsage(userId: number, period: 'day' | 'week' | 'month' = 'month') {
  return adminFetch<UserUsageSummary>(`/api/v1/admin/users/${userId}/usage${buildQuery({ period })}`);
}

export function listUserApiKeys(userId: number) {
  return adminFetch<PaginatedData<AdminApiKey>>(`/api/v1/admin/users/${userId}/api-keys${buildQuery({ page: 1, page_size: 100 })}`);
}

export function updateUserBalance(
  userId: number,
  body: { balance: number; operation: BalanceOperation; notes?: string },
  idempotencyKey?: string,
) {
  return adminFetch<AdminUser>(
    `/api/v1/admin/users/${userId}/balance`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    { idempotencyKey }
  );
}

export function updateUserStatus(userId: number, status: 'active' | 'disabled', idempotencyKey?: string) {
  return adminFetch<AdminUser>(`/api/v1/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }, { idempotencyKey });
}

export function listGroups(search = '', pagination: PaginationParams = {}) {
  return adminFetch<PaginatedData<AdminGroup>>(
    `/api/v1/admin/groups${buildQuery({ page: pagination.page ?? 1, page_size: pagination.page_size ?? 50, search: search.trim(), status: pagination.status, sort_by: pagination.sort, sort_order: pagination.order })}`
  );
}

export function getGroup(groupId: number) {
  return adminFetch<AdminGroup>(`/api/v1/admin/groups/${groupId}`);
}

export function createGroup(body: CreateGroupRequest, idempotencyKey?: string) {
  return adminFetch<AdminGroup>('/api/v1/admin/groups', {
    method: 'POST',
    body: JSON.stringify(body),
  }, { idempotencyKey });
}

/**
 * Returns the server-owned model candidates for a group's allowlist. The
 * endpoint is optional on older official deployments; callers should surface
 * its real error instead of inventing a model list.
 */
export function getGroupModelAllowlistCandidates(groupId: number, platform?: string) {
  return adminFetch<{ models: string[] }>(
    `/api/v1/admin/groups/${groupId}/model-allowlist-candidates${buildQuery({ platform })}`
  );
}

/** Update only fields supported by the official Sub2API group handler. */
export function updateGroup(groupId: number, body: UpdateGroupRequest, idempotencyKey?: string) {
  return adminFetch<AdminGroup>(
    `/api/v1/admin/groups/${groupId}`,
    { method: 'PUT', body: JSON.stringify(body) },
    { idempotencyKey }
  );
}

/** Permanently removes a group through the audited official admin endpoint. */
export function deleteGroup(groupId: number, idempotencyKey?: string) {
  return adminFetch<{ message?: string }>(
    `/api/v1/admin/groups/${groupId}`,
    { method: 'DELETE' },
    { idempotencyKey }
  );
}

export function listAccounts(search = '', pagination: PaginationParams = {}) {
  return adminFetch<PaginatedData<AdminAccount>>(
    `/api/v1/admin/accounts${buildQuery({ page: pagination.page ?? 1, page_size: pagination.page_size ?? 50, search: search.trim(), status: pagination.status, sort_by: pagination.sort, sort_order: pagination.order })}`
  );
}

export function getAccount(accountId: number) {
  return adminFetch<AdminAccount>(`/api/v1/admin/accounts/${accountId}`);
}

/** Update non-secret account settings through the official v0.2.13 endpoint.
 * Credentials are intentionally not part of this request type. The API masks
 * them on reads; sending them back would risk clearing or replacing a secret.
 */
export function updateAccount(accountId: number, body: UpdateAccountRequest, idempotencyKey?: string) {
  return adminFetch<AdminAccount>(`/api/v1/admin/accounts/${accountId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }, { idempotencyKey });
}

/** Returns models discovered for this upstream account. */
export function getAccountModels(accountId: number) {
  return adminFetch<AdminAccountModelsResponse>(`/api/v1/admin/accounts/${accountId}/models`);
}

/** Ask the upstream account to refresh its model catalogue. */
export function syncAccountModels(accountId: number, idempotencyKey?: string) {
  return adminFetch<AdminAccountModelsResponse>(`/api/v1/admin/accounts/${accountId}/models/sync-upstream`, {
    method: 'POST',
  }, { idempotencyKey });
}

/**
 * Save the complete server-redacted non-secret credential object with the
 * selected model mapping. The official handler preserves omitted credential
 * secrets server-side; this mobile client never reads or sends masked API
 * keys, tokens, cookies, or private keys.
 */
export function updateAccountModelMapping(accountId: number, credentials: Record<string, unknown>, idempotencyKey?: string) {
  return adminFetch<AdminAccount>(`/api/v1/admin/accounts/${accountId}`, {
    method: 'PUT',
    body: JSON.stringify({ credentials }),
  }, { idempotencyKey });
}

/** Proxies available to bind to an account; secrets are never requested. */
export function listAccountProxies() {
  return adminFetch<AdminProxy[] | PaginatedData<AdminProxy> | { items?: AdminProxy[]; proxies?: AdminProxy[] }>('/api/v1/admin/proxies/all');
}

export function createAccount(body: CreateAccountRequest, idempotencyKey?: string) {
  return adminFetch<AdminAccount>('/api/v1/admin/accounts', {
    method: 'POST',
    body: JSON.stringify(body),
  }, { idempotencyKey });
}

export function getAccountTodayStats(accountId: number) {
  return adminFetch<AccountTodayStats>(`/api/v1/admin/accounts/${accountId}/today-stats`);
}

export function testAccount(accountId: number, idempotencyKey?: string) {
  return adminFetch(`/api/v1/admin/accounts/${accountId}/test`, {
    method: 'POST',
  }, { idempotencyKey });
}

export function refreshAccount(accountId: number, idempotencyKey?: string) {
  return adminFetch(`/api/v1/admin/accounts/${accountId}/refresh`, {
    method: 'POST',
  }, { idempotencyKey });
}

export function setAccountSchedulable(accountId: number, schedulable: boolean, idempotencyKey?: string) {
  return adminFetch<AdminAccount>(`/api/v1/admin/accounts/${accountId}/schedulable`, {
    method: 'POST',
    body: JSON.stringify({ schedulable }),
  }, { idempotencyKey });
}

export function clearAccountError(accountId: number, idempotencyKey?: string) {
  return adminFetch(`/api/v1/admin/accounts/${accountId}/clear-error`, { method: 'POST' }, { idempotencyKey });
}

export function recoverAccountState(accountId: number, idempotencyKey?: string) {
  return adminFetch(`/api/v1/admin/accounts/${accountId}/recover-state`, { method: 'POST' }, { idempotencyKey });
}

export type BatchAccountError = { account_id?: number; error?: string };
export type BatchAccountOperationResult = {
  total?: number;
  success?: number;
  failed?: number;
  success_ids?: number[];
  failed_ids?: number[];
  errors?: BatchAccountError[];
  warnings?: BatchAccountError[];
};

/** Execute a server-owned batch refresh for the selected account IDs. */
export function batchRefreshAccounts(accountIds: number[], idempotencyKey?: string) {
  return adminFetch<BatchAccountOperationResult>('/api/v1/admin/accounts/batch-refresh', {
    method: 'POST',
    body: JSON.stringify({ account_ids: accountIds }),
  }, { idempotencyKey });
}

/** Clear only the server-recorded error state for the selected accounts. */
export function batchClearAccountErrors(accountIds: number[], idempotencyKey?: string) {
  return adminFetch<BatchAccountOperationResult>('/api/v1/admin/accounts/batch-clear-error', {
    method: 'POST',
    body: JSON.stringify({ account_ids: accountIds }),
  }, { idempotencyKey });
}

/** Delete selected accounts through the audited backend batch endpoint. */
export function batchDeleteAccounts(accountIds: number[], idempotencyKey?: string) {
  return adminFetch<BatchAccountOperationResult>('/api/v1/admin/accounts/batch-delete', {
    method: 'POST',
    body: JSON.stringify({ account_ids: accountIds }),
  }, { idempotencyKey });
}

export function listUsageLogs(params: PaginationParams & { user_id?: number; account_id?: number; model?: string } = {}) {
  return adminFetch<PaginatedData<UsageLog>>(`/api/v1/admin/usage${buildQuery({
    page: params.page ?? 1,
    page_size: params.page_size ?? 30,
    search: params.search,
    user_id: params.user_id,
    account_id: params.account_id,
    model: params.model,
    sort_by: params.sort ?? 'created_at',
    sort_order: params.order ?? 'desc',
  })}`);
}

/** Lists persisted client-visible request errors from the audited ops store. */
export function listRequestErrors(params: { page?: number; page_size?: number; q?: string; model?: string; resolved?: boolean } = {}) {
  return adminFetch<PaginatedData<AdminRequestError>>(`/api/v1/admin/ops/request-errors${buildQuery({
    page: params.page ?? 1,
    page_size: params.page_size ?? 30,
    q: params.q,
    model: params.model,
    resolved: params.resolved,
    sort_by: 'created_at',
    sort_order: 'desc',
  })}`);
}

export function getSystemVersion() {
  return adminFetch<SystemVersion>('/api/v1/admin/system/version');
}
