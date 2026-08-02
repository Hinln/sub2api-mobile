import { adminFetch, adminFetchText } from '@/src/lib/admin-fetch';
import type {
  AccountTodayStats,
  AccountTestResult,
  AccountUsageStats,
  AdminAccount,
  AdminApiKey,
  AdminGroup,
  AdminSettings,
  AdminUser,
  Announcement,
  AnnouncementUserReadStatus,
  AuditLog,
  BalanceOperation,
  CreateAnnouncementRequest,
  DashboardModelStats,
  DashboardSnapshot,
  DashboardStats,
  DashboardTrend,
  CreateAccountRequest,
  CreatePromoCodeRequest,
  CreateUserRequest,
  PaymentDashboardStats,
  PaymentOrder,
  PaginatedData,
  PaginationParams,
  PromoCode,
  PromoCodeUsage,
  SubscriptionPlan,
  SystemVersion,
  UsageLog,
  UsageStats,
  UserUsageSummary,
  UpdateAccountRequest,
  AvailableAccountModel,
} from '@/src/types/admin';

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

export function getPaymentDashboard(days = 30) {
  return adminFetch<PaymentDashboardStats>(`/api/v1/admin/payment/dashboard${buildQuery({ days })}`);
}

export function listPaymentOrders(params: PaginationParams & {
  payment_type?: string;
  user_id?: number;
  keyword?: string;
  order_type?: string;
} = {}) {
  return adminFetch<PaginatedData<PaymentOrder>>(`/api/v1/admin/payment/orders${buildQuery({
    page: params.page ?? 1,
    page_size: params.page_size ?? 30,
    status: params.status,
    payment_type: params.payment_type,
    user_id: params.user_id,
    keyword: params.keyword,
    order_type: params.order_type,
  })}`);
}

export function listPaymentPlans() {
  return adminFetch<SubscriptionPlan[]>('/api/v1/admin/payment/plans');
}

export function listPromoCodes(search = '', pagination: PaginationParams = {}) {
  return adminFetch<PaginatedData<PromoCode>>(`/api/v1/admin/promo-codes${buildQuery({
    page: pagination.page ?? 1,
    page_size: pagination.page_size ?? 30,
    status: pagination.status,
    search: search.trim(),
    sort_by: pagination.sort ?? 'created_at',
    sort_order: pagination.order ?? 'desc',
  })}`);
}

export function createPromoCode(body: CreatePromoCodeRequest) {
  return adminFetch<PromoCode>('/api/v1/admin/promo-codes', {
    method: 'POST',
    body: JSON.stringify(body),
  }, {
    idempotencyKey: `promo-code-create-${Date.now()}`,
  });
}

export function listPromoCodeUsages(promoCodeId: number, page = 1, pageSize = 50) {
  return adminFetch<PaginatedData<PromoCodeUsage>>(`/api/v1/admin/promo-codes/${promoCodeId}/usages${buildQuery({
    page,
    page_size: pageSize,
  })}`);
}

export function listAuditLogs(params: PaginationParams & {
  start_time?: string;
  end_time?: string;
  actor_user_id?: number;
  actor_email?: string;
  auth_method?: string;
  action?: string;
  method?: string;
  client_ip?: string;
  success?: boolean;
  q?: string;
} = {}) {
  return adminFetch<PaginatedData<AuditLog>>(`/api/v1/admin/audit-logs${buildQuery({
    page: params.page ?? 1,
    page_size: params.page_size ?? 30,
    start_time: params.start_time,
    end_time: params.end_time,
    actor_user_id: params.actor_user_id,
    actor_email: params.actor_email,
    auth_method: params.auth_method,
    action: params.action,
    method: params.method,
    client_ip: params.client_ip,
    success: params.success,
    q: params.q,
  })}`);
}

export function listAnnouncements(search = '', pagination: PaginationParams = {}) {
  return adminFetch<PaginatedData<Announcement>>(`/api/v1/admin/announcements${buildQuery({
    page: pagination.page ?? 1,
    page_size: pagination.page_size ?? 30,
    status: pagination.status,
    search: search.trim(),
    sort_by: pagination.sort ?? 'created_at',
    sort_order: pagination.order ?? 'desc',
  })}`);
}

export function createAnnouncement(body: CreateAnnouncementRequest) {
  return adminFetch<Announcement>('/api/v1/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(body),
  }, {
    idempotencyKey: `announcement-create-${Date.now()}`,
  });
}

export function listAnnouncementReadStatus(announcementId: number, page = 1, pageSize = 50) {
  return adminFetch<PaginatedData<AnnouncementUserReadStatus>>(`/api/v1/admin/announcements/${announcementId}/read-status${buildQuery({
    page,
    page_size: pageSize,
    sort_by: 'email',
    sort_order: 'asc',
  })}`);
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
    `/api/v1/admin/users${buildQuery({ page: pagination.page ?? 1, page_size: pagination.page_size ?? 20, search: search.trim(), status: pagination.status, sort_by: pagination.sort, sort_order: pagination.order })}`
  );
}

export function getUser(userId: number) {
  return adminFetch<AdminUser>(`/api/v1/admin/users/${userId}`);
}

export function createUser(body: CreateUserRequest) {
  return adminFetch<AdminUser>('/api/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getUserUsage(userId: number, period: 'day' | 'week' | 'month' = 'month') {
  return adminFetch<UserUsageSummary>(`/api/v1/admin/users/${userId}/usage${buildQuery({ period })}`);
}

export function listUserApiKeys(userId: number) {
  return adminFetch<PaginatedData<AdminApiKey>>(`/api/v1/admin/users/${userId}/api-keys${buildQuery({ page: 1, page_size: 100 })}`);
}

export function updateUserBalance(
  userId: number,
  body: { balance: number; operation: BalanceOperation; notes?: string }
) {
  return adminFetch<AdminUser>(
    `/api/v1/admin/users/${userId}/balance`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    {
      idempotencyKey: `user-balance-${userId}-${Date.now()}`,
    }
  );
}

export function updateUserStatus(userId: number, status: 'active' | 'disabled') {
  return adminFetch<AdminUser>(`/api/v1/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export function listGroups(search = '', pagination: PaginationParams = {}) {
  return adminFetch<PaginatedData<AdminGroup>>(
    `/api/v1/admin/groups${buildQuery({ page: pagination.page ?? 1, page_size: pagination.page_size ?? 50, search: search.trim(), status: pagination.status })}`
  );
}

export function getGroup(groupId: number) {
  return adminFetch<AdminGroup>(`/api/v1/admin/groups/${groupId}`);
}

export function listAccounts(search = '', pagination: PaginationParams = {}) {
  return adminFetch<PaginatedData<AdminAccount>>(
    `/api/v1/admin/accounts${buildQuery({ page: pagination.page ?? 1, page_size: pagination.page_size ?? 50, search: search.trim(), status: pagination.status, sort_by: pagination.sort, sort_order: pagination.order })}`
  );
}

export function getAccount(accountId: number) {
  return adminFetch<AdminAccount>(`/api/v1/admin/accounts/${accountId}`);
}

export function updateAccount(accountId: number, body: UpdateAccountRequest) {
  return adminFetch<AdminAccount>(`/api/v1/admin/accounts/${accountId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function createAccount(body: CreateAccountRequest) {
  return adminFetch<AdminAccount>('/api/v1/admin/accounts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getAccountTodayStats(accountId: number) {
  return adminFetch<AccountTodayStats>(`/api/v1/admin/accounts/${accountId}/today-stats`);
}

export function getAccountStats(accountId: number, days = 30) {
  return adminFetch<AccountUsageStats>(`/api/v1/admin/accounts/${accountId}/stats${buildQuery({ days })}`);
}

export function getAccountModels(accountId: number) {
  return adminFetch<AvailableAccountModel[]>(`/api/v1/admin/accounts/${accountId}/models`);
}

type AccountTestEvent = {
  type?: string;
  text?: string;
  status?: string;
  success?: boolean;
  error?: string;
};

function safeAccountTestMessage(value: string) {
  return value.replace(/(?:admin-|sk-)[A-Za-z0-9._-]+/gi, '[REDACTED]').slice(0, 500);
}

export function parseAccountTestEventStream(raw: string, latencyMs?: number): AccountTestResult {
  let sawEvent = false;
  let completed = false;
  let success = false;
  let errorMessage = '';
  const content: string[] = [];

  raw.replace(/\r\n/g, '\n').split('\n').forEach((line) => {
    if (!line.startsWith('data:')) return;
    const value = line.slice(5).trim();
    if (!value || value === '[DONE]') return;

    let event: AccountTestEvent;
    try {
      event = JSON.parse(value) as AccountTestEvent;
    } catch {
      return;
    }
    sawEvent = true;
    if (event.type === 'content' && event.text) content.push(event.text);
    if (event.type === 'error' || event.error) errorMessage = event.error || event.status || 'Hub 返回连接测试失败。';
    if (event.type === 'test_complete') {
      completed = true;
      success = event.success === true;
    }
  });

  if (!sawEvent) throw new Error('Hub 返回的账号测试流为空或格式无效。');
  if (errorMessage) return { success: false, message: safeAccountTestMessage(errorMessage), latency_ms: latencyMs };
  if (!completed) throw new Error('Hub 返回的账号测试流未正常结束。');

  const responseText = content.join('').trim();
  return {
    success,
    message: safeAccountTestMessage(responseText) || (success ? 'Hub 已完成真实连通性测试。' : 'Hub 返回连接测试失败。'),
    latency_ms: latencyMs,
  };
}

export async function testAccount(accountId: number) {
  const startedAt = Date.now();
  const raw = await adminFetchText(`/api/v1/admin/accounts/${accountId}/test`, {
    method: 'POST',
    headers: { Accept: 'text/event-stream' },
  }, {
    timeoutMs: 120_000,
  });
  return parseAccountTestEventStream(raw, Date.now() - startedAt);
}

export function refreshAccount(accountId: number) {
  return adminFetch(`/api/v1/admin/accounts/${accountId}/refresh`, {
    method: 'POST',
  });
}

export function setAccountSchedulable(accountId: number, schedulable: boolean) {
  return adminFetch<AdminAccount>(`/api/v1/admin/accounts/${accountId}/schedulable`, {
    method: 'POST',
    body: JSON.stringify({ schedulable }),
  });
}

export function clearAccountError(accountId: number) {
  return adminFetch(`/api/v1/admin/accounts/${accountId}/clear-error`, { method: 'POST' });
}

export function recoverAccountState(accountId: number) {
  return adminFetch(`/api/v1/admin/accounts/${accountId}/recover-state`, { method: 'POST' });
}

export function listUsageLogs(params: PaginationParams & { user_id?: number; account_id?: number; model?: string } = {}) {
  return adminFetch<PaginatedData<UsageLog>>(`/api/v1/admin/usage${buildQuery({
    page: params.page ?? 1,
    page_size: params.page_size ?? 30,
    user_id: params.user_id,
    account_id: params.account_id,
    model: params.model,
    sort_by: params.sort ?? 'created_at',
    sort_order: params.order ?? 'desc',
  })}`);
}

export function getSystemVersion() {
  return adminFetch<SystemVersion>('/api/v1/admin/system/version');
}
