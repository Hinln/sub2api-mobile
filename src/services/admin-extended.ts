import { adminFetch } from '@/src/lib/admin-fetch';
import { buildQuery } from '@/src/services/admin';
import type { PaginatedData } from '@/src/types/admin';

export type AdminAnnouncement = {
  id: number;
  title: string;
  content: string;
  status?: string;
  notify_mode?: string;
  created_at?: string;
  updated_at?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  targeting?: Record<string, unknown>;
};

export type AdminPaymentOrder = Record<string, unknown> & {
  id: number;
  out_trade_no?: string;
  status?: string;
  amount?: number;
  pay_amount?: number;
  /** Gateway amount in the order's currency; the official UI labels this as 实付. */
  currency?: string;
  fee_rate?: number;
  payment_type?: string;
  user_email?: string;
  user_name?: string;
  created_at?: string;
};

export type AdminPaymentDashboard = {
  /** Official /api/v1/admin/payment/dashboard response. Missing values remain
   * unavailable in the UI; a numeric zero is shown only when the server
   * explicitly returns zero. */
  today_amount?: Record<string, number>;
  total_amount?: Record<string, number>;
  avg_amount?: Record<string, number>;
  today_count?: number;
  total_count?: number;
  pending_orders?: number;
  daily_series?: { date: string; amount?: Record<string, number>; count?: number }[];
  payment_methods?: { type: string; amount?: Record<string, number>; count?: number }[];
};

export type AuditLogEntry = Record<string, unknown> & {
  id: number;
  action?: string;
  method?: string;
  path?: string;
  actor_email?: string;
  status_code?: number;
  success?: boolean;
  created_at?: string;
};

export type AlertEvent = Record<string, unknown> & {
  id: number;
  rule_id?: number;
  status?: string;
  severity?: string;
  title?: string;
  description?: string;
  /** Kept for compatibility with older/private Hub responses. */
  message?: string;
  metric_value?: number | null;
  threshold_value?: number | null;
  dimensions?: Record<string, unknown>;
  fired_at?: string;
  resolved_at?: string | null;
  email_sent?: boolean;
  created_at?: string;
};

export type AlertEventStatusUpdate = {
  updated?: boolean;
};

/** Official Sub2API v0.2.13 operations dashboard overview. */
export type OpsPercentiles = {
  p50_ms?: number | null;
  p90_ms?: number | null;
  p95_ms?: number | null;
  p99_ms?: number | null;
  avg_ms?: number | null;
  max_ms?: number | null;
};

export type OpsSystemMetricsSnapshot = {
  id?: number;
  created_at?: string;
  window_minutes?: number;
  cpu_usage_percent?: number | null;
  memory_used_mb?: number | null;
  memory_total_mb?: number | null;
  memory_usage_percent?: number | null;
  db_ok?: boolean | null;
  redis_ok?: boolean | null;
  db_max_open_conns?: number | null;
  redis_pool_size?: number | null;
  redis_conn_total?: number | null;
  redis_conn_idle?: number | null;
  db_conn_active?: number | null;
  db_conn_idle?: number | null;
  db_conn_waiting?: number | null;
  goroutine_count?: number | null;
  concurrency_queue_depth?: number | null;
  account_switch_count?: number | null;
};

export type OpsJobHeartbeat = {
  job_name: string;
  last_run_at?: string | null;
  last_success_at?: string | null;
  last_error_at?: string | null;
  last_error?: string | null;
  last_duration_ms?: number | null;
  last_result?: string | null;
  updated_at?: string;
};

export type OpsRateSummary = { current?: number; peak?: number; avg?: number };

export type OpsDashboardOverview = {
  start_time?: string;
  end_time?: string;
  platform?: string;
  group_id?: number | null;
  health_score?: number;
  system_metrics?: OpsSystemMetricsSnapshot | null;
  job_heartbeats?: OpsJobHeartbeat[] | null;
  success_count?: number;
  error_count_total?: number;
  business_limited_count?: number;
  error_count_sla?: number;
  request_count_total?: number;
  request_count_sla?: number;
  token_consumed?: number;
  sla?: number;
  error_rate?: number;
  upstream_error_rate?: number;
  upstream_error_count_excl_429_529?: number;
  upstream_429_count?: number;
  upstream_529_count?: number;
  qps?: OpsRateSummary;
  tps?: OpsRateSummary;
  duration?: OpsPercentiles;
  ttft?: OpsPercentiles;
};

export function listAdminAnnouncements(params: { page?: number; page_size?: number; search?: string; status?: string } = {}) {
  return adminFetch<PaginatedData<AdminAnnouncement>>(`/api/v1/admin/announcements${buildQuery({ page: params.page ?? 1, page_size: params.page_size ?? 20, search: params.search, status: params.status })}`);
}

export function createAdminAnnouncement(body: { title: string; content: string; status?: 'draft' | 'active' | 'archived'; notify_mode?: 'silent' | 'popup' }, idempotencyKey?: string) {
  return adminFetch<AdminAnnouncement>('/api/v1/admin/announcements', { method: 'POST', body: JSON.stringify(body) }, { idempotencyKey });
}

export function updateAdminAnnouncement(id: number, body: Partial<Pick<AdminAnnouncement, 'title' | 'content' | 'status' | 'notify_mode'>>) {
  return adminFetch<AdminAnnouncement>(`/api/v1/admin/announcements/${id}`, { method: 'PUT', body: JSON.stringify(body) }, { idempotencyKey: `mobile-admin-announcement-update-${id}` });
}

export function deleteAdminAnnouncement(id: number) {
  return adminFetch<{ message?: string }>(`/api/v1/admin/announcements/${id}`, { method: 'DELETE' }, { idempotencyKey: `mobile-admin-announcement-delete-${id}` });
}

export function listAdminPaymentOrders(params: { page?: number; page_size?: number; status?: string; search?: string } = {}) {
  // The official v0.2.13 handler calls this filter `keyword`; `search` is
  // accepted by several other admin list endpoints but is ignored here.
  return adminFetch<PaginatedData<AdminPaymentOrder>>(`/api/v1/admin/payment/orders${buildQuery({ page: params.page ?? 1, page_size: params.page_size ?? 20, status: params.status, keyword: params.search })}`);
}

export function getAdminPaymentDashboard() {
  return adminFetch<AdminPaymentDashboard>('/api/v1/admin/payment/dashboard');
}

export function cancelAdminPaymentOrder(id: number, idempotencyKey?: string) {
  return adminFetch<Record<string, unknown>>(`/api/v1/admin/payment/orders/${id}/cancel`, { method: 'POST' }, { idempotencyKey });
}

export function retryAdminPaymentOrder(id: number, idempotencyKey?: string) {
  return adminFetch<Record<string, unknown>>(`/api/v1/admin/payment/orders/${id}/retry`, { method: 'POST' }, { idempotencyKey });
}

export function refundAdminPaymentOrder(id: number, body: { amount?: number; reason: string; force?: boolean; deduct_balance?: boolean }, idempotencyKey?: string) {
  return adminFetch<Record<string, unknown>>(`/api/v1/admin/payment/orders/${id}/refund`, { method: 'POST', body: JSON.stringify(body) }, { idempotencyKey });
}

export function queryAdminPaymentRefund(id: number, idempotencyKey?: string) {
  return adminFetch<Record<string, unknown>>(`/api/v1/admin/payment/orders/${id}/refund/query`, { method: 'POST' }, { idempotencyKey });
}

export function listAuditLogs(params: { page?: number; page_size?: number; q?: string; action?: string; success?: boolean } = {}) {
  return adminFetch<PaginatedData<AuditLogEntry>>(`/api/v1/admin/audit-logs${buildQuery({ page: params.page ?? 1, page_size: params.page_size ?? 30, q: params.q, action: params.action, success: params.success })}`);
}

/**
 * The official Sub2API ops endpoint returns an array of events (inside the
 * standard response envelope when envelopes are enabled), not PaginatedData.
 * It uses cursor/limit pagination; the mobile console currently only needs the
 * first batch, so expose the server's `limit` contract directly.
 */
export function listAlertEvents(params: { limit?: number; page_size?: number; status?: string; severity?: string } = {}) {
  return adminFetch<AlertEvent[]>(`/api/v1/admin/ops/alert-events${buildQuery({ limit: params.limit ?? params.page_size ?? 30, status: params.status, severity: params.severity })}`);
}

export function updateAlertEventStatus(id: number, status: string) {
  return adminFetch<AlertEventStatusUpdate>(`/api/v1/admin/ops/alert-events/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }, { idempotencyKey: `mobile-admin-alert-status-${id}-${status}` });
}

export function getComplianceStatus() {
  return adminFetch<Record<string, unknown>>('/api/v1/admin/compliance');
}

export function acceptCompliance(body: Record<string, unknown> = {}) {
  return adminFetch<Record<string, unknown>>('/api/v1/admin/compliance/accept', { method: 'POST', body: JSON.stringify(body) }, { idempotencyKey: 'mobile-admin-compliance-accept' });
}

export function getAccountAvailability() {
  return adminFetch<Record<string, unknown>>('/api/v1/admin/ops/account-availability');
}

/** Returns the official ops overview; the endpoint may be disabled by server configuration. */
export function getOpsDashboardOverview(params: { time_range?: '5m' | '30m' | '1h' | '6h' | '24h'; platform?: string; group_id?: number; mode?: 'auto' | 'raw' | 'preagg' } = {}) {
  return adminFetch<OpsDashboardOverview>(`/api/v1/admin/ops/dashboard/overview${buildQuery({ time_range: params.time_range ?? '1h', platform: params.platform, group_id: params.group_id, mode: params.mode ?? 'auto' })}`);
}
