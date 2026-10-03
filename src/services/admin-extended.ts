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
  payment_type?: string;
  user_email?: string;
  created_at?: string;
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
  return adminFetch<PaginatedData<AdminPaymentOrder>>(`/api/v1/admin/payment/orders${buildQuery({ page: params.page ?? 1, page_size: params.page_size ?? 20, status: params.status, search: params.search })}`);
}

export function getAdminPaymentDashboard() {
  return adminFetch<Record<string, unknown>>('/api/v1/admin/payment/dashboard');
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
