import { adminFetch } from '@/src/lib/admin-fetch';
import { buildQuery } from '@/src/services/admin';

export type UserProfile = { id: number; email: string; username?: string; role?: string; balance?: number; status?: string; [key: string]: unknown };
export type PaginatedData<T> = { items: T[]; total: number; page: number; page_size: number; pages: number };
export type UserApiKey = { id: number; name: string; key: string; status: 'active' | 'inactive' | string; group_id?: number | null; quota?: number; quota_used?: number; expires_at?: string | null; created_at?: string; last_used_at?: string | null; current_concurrency?: number; rate_limit_5h?: number; rate_limit_1d?: number; rate_limit_7d?: number; usage_5h?: number; usage_1d?: number; usage_7d?: number; group?: { id: number; name: string; platform?: string } | null };
export type UsageLog = { id: number; request_id?: string; model?: string; api_key_id?: number; total_tokens?: number; input_tokens?: number; output_tokens?: number; total_cost?: number; duration_ms?: number | null; status_code?: number; error_message?: string; request_type?: string; created_at?: string; stream?: boolean };
export type UsageStats = Record<string, unknown> & { total_requests?: number; total_tokens?: number; total_cost?: number };
export type UserAnnouncement = { id: number; title: string; content: string; notify_mode?: string; read_at?: string | null; starts_at?: string | null; ends_at?: string | null; created_at?: string; updated_at?: string };
export type UserSubscription = Record<string, unknown> & { id: number; status?: string; group_name?: string; expires_at?: string };
export type CheckoutPlan = { id: number; group_id: number; name: string; description?: string; price: number; original_price?: number | null; currency?: string; validity_days?: number; validity_unit?: string; features?: string | string[]; product_name?: string };
export type CheckoutInfo = { methods?: Record<string, { enabled?: boolean; min?: number; max?: number }>; global_min?: number; global_max?: number; plans: CheckoutPlan[]; balance_disabled?: boolean; help_text?: string; stripe_publishable_key?: string };
export type PaymentOrder = { id: number; amount: number; pay_amount?: number; currency?: string; payment_type: string; out_trade_no: string; status: string; order_type?: string; plan_id?: number | null; created_at: string; expires_at?: string; paid_at?: string | null; completed_at?: string | null };

export function getUserProfile() { return adminFetch<UserProfile>('/api/v1/user/profile'); }

export function getUserDashboardSnapshot() {
  const end = new Date(); const start = new Date(end); start.setDate(start.getDate() - 30); const format = (value: Date) => value.toISOString().slice(0, 10);
  return adminFetch<Record<string, unknown>>(`/api/v1/usage/dashboard/snapshot-v2${buildQuery({ start_date: format(start), end_date: format(end), include_trend: true, include_model_stats: true, include_stats: true })}`);
}

export function listUserApiKeys(params: { page?: number; page_size?: number; status?: string } = {}) { return adminFetch<PaginatedData<UserApiKey>>(`/api/v1/keys${buildQuery({ page: params.page ?? 1, page_size: params.page_size ?? 100, status: params.status })}`); }
export function getUserApiKey(id: number) { return adminFetch<UserApiKey>(`/api/v1/keys/${id}`); }
export function listAvailableGroups() { return adminFetch<{ id: number; name: string; platform?: string }[]>('/api/v1/groups/available'); }
export function createUserApiKey(body: { name: string; group_id?: number | null; quota?: number; expires_in_days?: number; rate_limit_5h?: number; rate_limit_1d?: number; rate_limit_7d?: number }, idempotencyKey?: string) { return adminFetch<UserApiKey>('/api/v1/keys', { method: 'POST', body: JSON.stringify(body) }, { idempotencyKey }); }
export function updateUserApiKey(id: number, body: { name?: string; status?: 'active' | 'inactive'; group_id?: number | null; quota?: number; expires_at?: string | null; reset_quota?: boolean }) { return adminFetch<UserApiKey>(`/api/v1/keys/${id}`, { method: 'PUT', body: JSON.stringify(body) }); }
export function deleteUserApiKey(id: number) { return adminFetch<{ message: string }>(`/api/v1/keys/${id}`, { method: 'DELETE' }, { idempotencyKey: `mobile-user-key-delete-${id}-${Date.now()}` }); }

export function listUsageLogs(params: { page?: number; page_size?: number; api_key_id?: number; period?: string; start_date?: string; end_date?: string } = {}) { return adminFetch<PaginatedData<UsageLog>>(`/api/v1/usage${buildQuery({ page: params.page ?? 1, page_size: params.page_size ?? 30, api_key_id: params.api_key_id, period: params.period, start_date: params.start_date, end_date: params.end_date, sort_by: 'created_at', sort_order: 'desc' })}`); }
export function getUsageStats(params: { period?: string; start_date?: string; end_date?: string; api_key_id?: number } = {}) { return adminFetch<UsageStats>(`/api/v1/usage/stats${buildQuery(params)}`); }
export function getApiKeyDailyUsage(id: number, params: { start_date?: string; end_date?: string } = {}) { return adminFetch<Record<string, unknown>>(`/api/v1/user/api-keys/${id}/usage/daily${buildQuery(params)}`); }

export function listUserAnnouncements() { return adminFetch<UserAnnouncement[]>('/api/v1/announcements'); }
export function markAnnouncementRead(id: number) { return adminFetch<{ message?: string }>(`/api/v1/announcements/${id}/read`, { method: 'POST' }, { idempotencyKey: `mobile-announcement-read-${id}` }); }
export function listUserSubscriptions() { return adminFetch<UserSubscription[]>('/api/v1/subscriptions'); }
export function getActiveSubscriptionSummary() { return adminFetch<{ active_count?: number; total_used_usd?: number; subscriptions?: UserSubscription[] }>('/api/v1/subscriptions/summary'); }

export function getCheckoutInfo() { return adminFetch<CheckoutInfo>('/api/v1/payment/checkout-info'); }
export function listPaymentOrders(params: { page?: number; page_size?: number; status?: string } = {}) { return adminFetch<PaginatedData<PaymentOrder>>(`/api/v1/payment/orders/my${buildQuery({ page: params.page ?? 1, page_size: params.page_size ?? 20, status: params.status })}`); }
export function createPaymentOrder(body: { amount: number; payment_type: string; order_type?: string; plan_id?: number; is_mobile?: boolean }, idempotencyKey?: string) {
  return adminFetch<PaymentOrder & Record<string, unknown>>('/api/v1/payment/orders', { method: 'POST', body: JSON.stringify({ ...body, is_mobile: true }) }, { idempotencyKey });
}
export function cancelPaymentOrder(id: number) { return adminFetch<{ message: string }>(`/api/v1/payment/orders/${id}/cancel`, { method: 'POST' }, { idempotencyKey: `mobile-payment-cancel-${id}-${Date.now()}` }); }
export function verifyPaymentOrder(outTradeNo: string) { return adminFetch<PaymentOrder>('/api/v1/payment/orders/verify', { method: 'POST', body: JSON.stringify({ out_trade_no: outTradeNo }) }); }
export function requestPaymentRefund(id: number, reason: string) { return adminFetch<{ message: string }>(`/api/v1/payment/orders/${id}/refund-request`, { method: 'POST', body: JSON.stringify({ reason }) }, { idempotencyKey: `mobile-payment-refund-${id}-${Date.now()}` }); }
