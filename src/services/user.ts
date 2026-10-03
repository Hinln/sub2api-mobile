import { adminFetch } from '@/src/lib/admin-fetch';
import { buildQuery } from '@/src/services/admin';

export type UserProfile = { id: number; email: string; username?: string | null; role?: string; balance?: number | string | null; status?: string; email_verified?: boolean; avatar_url?: string; balance_notify_enabled?: boolean; balance_notify_threshold?: number | string | null; [key: string]: unknown };
export type PaginatedData<T> = { items: T[]; total: number; page: number; page_size: number; pages: number };
export type UserApiKey = { id: number; name: string; key: string; status: 'active' | 'inactive' | string; group_id?: number | null; quota?: number; quota_used?: number; expires_at?: string | null; created_at?: string; last_used_at?: string | null; current_concurrency?: number; rate_limit_5h?: number; rate_limit_1d?: number; rate_limit_7d?: number; usage_5h?: number; usage_1d?: number; usage_7d?: number; group?: { id: number; name: string; platform?: string } | null };
export type UsageLog = { id: number; request_id?: string; model?: string; api_key_id?: number; total_tokens?: number; input_tokens?: number; output_tokens?: number; total_cost?: number; actual_cost?: number; duration_ms?: number | null; request_type?: string; created_at?: string; stream?: boolean };
export type UsageStats = Record<string, unknown> & { total_requests?: number; total_tokens?: number; total_cost?: number };
export type UserAnnouncement = { id: number; title: string; content: string; notify_mode?: string; read_at?: string | null; starts_at?: string | null; ends_at?: string | null; created_at?: string; updated_at?: string };
export type UserSubscription = Record<string, unknown> & { id: number; status?: string; group_name?: string; expires_at?: string };
export type CheckoutPlan = { id: number; group_id: number; name: string; description?: string; price: number; original_price?: number | null; currency?: string; validity_days?: number; validity_unit?: string; features?: string | string[]; product_name?: string };
export type CheckoutInfo = { methods?: Record<string, { enabled?: boolean; min?: number; max?: number }>; global_min?: number; global_max?: number; plans: CheckoutPlan[]; balance_disabled?: boolean; help_text?: string; stripe_publishable_key?: string };
export type PaymentOrder = { id?: number; order_id?: number; amount: number; pay_amount?: number; currency?: string; payment_type: string; out_trade_no: string; status: string; order_type?: string; plan_id?: number | null; created_at?: string; expires_at?: string; paid_at?: string | null; completed_at?: string | null };
export type PaymentOAuthInfo = {
  authorize_url?: string;
  app_id?: string;
  scope?: string;
  state?: string;
  openid?: string;
  redirect_url?: string;
};
export type PaymentJSAPIPayload = {
  appId?: string;
  timeStamp?: string;
  nonceStr?: string;
  package?: string;
  signType?: string;
  paySign?: string;
};
/** Response returned by POST /api/v1/payment/orders. */
export type PaymentCreateResponse = PaymentOrder & {
  fee_rate?: number;
  result_type?: string;
  pay_url?: string;
  checkout_url?: string;
  payment_url?: string;
  redirect_url?: string;
  qr_code?: string;
  client_secret?: string;
  intent_id?: string;
  payment_mode?: string;
  payment_env?: string;
  resume_token?: string;
  oauth?: PaymentOAuthInfo;
  jsapi?: PaymentJSAPIPayload;
  jsapi_payload?: PaymentJSAPIPayload;
  /** Set by the official server when qr_code is an Alipay precreate payload. */
  alipay_mobile_precreate_deep_link?: boolean;
};

export type PaymentAction = { url: string; source: 'pay_url' | 'checkout_url' | 'payment_url' | 'redirect_url' | 'qr_code' | 'alipay_deep_link' };

export type PaymentOAuthAction = { url: string; source: 'oauth_required' };

const ALIPAY_DEEP_LINK_PREFIX = 'alipays://platformapi/startapp?saId=10000007&qrcode=';

/**
 * Converts the official mobile Alipay precreate payload into the app deep link
 * understood by the Alipay iOS/Android client. The payload itself is not a
 * URL and must never be passed directly to Linking.openURL.
 */
export function buildAlipayDeepLink(qrCode: string) {
  const payload = qrCode.trim();
  return payload ? `${ALIPAY_DEEP_LINK_PREFIX}${encodeURIComponent(payload)}` : '';
}

function isAlipayPaymentType(paymentType: unknown) {
  return typeof paymentType === 'string' && paymentType.toLowerCase().includes('alipay');
}

/**
 * Resolves the server OAuth continuation URL. Official responses normally
 * return a root-relative path; absolute HTTP(S) URLs are accepted for
 * deployments that put the OAuth callback behind a separate first-party host.
 */
export function resolvePaymentOAuthURL(value: PaymentCreateResponse, baseUrl: string): PaymentOAuthAction | undefined {
  if (value.result_type !== 'oauth_required') return undefined;
  const raw = value.oauth?.authorize_url?.trim();
  if (!raw || /^javascript:/i.test(raw)) return undefined;
  if (raw.startsWith('//')) return undefined;
  try {
    const parsed = new URL(raw, `${baseUrl.trim().replace(/\/+$/, '')}/`);
    if (!new Set(['http:', 'https:']).has(parsed.protocol)) return undefined;
    return { url: parsed.toString(), source: 'oauth_required' };
  } catch {
    return undefined;
  }
}

/**
 * Selects an actionable URL returned by the payment provider. A Stripe
 * client_secret or an opaque QR payload is deliberately not treated as a
 * payable link because the mobile client has no provider SDK to complete it.
 */
export function resolvePaymentAction(value: PaymentCreateResponse): PaymentAction | undefined {
  const candidates: [PaymentAction['source'], unknown][] = [
    ['pay_url', value.pay_url],
    ['checkout_url', value.checkout_url],
    ['payment_url', value.payment_url],
    ['redirect_url', value.redirect_url],
  ];
  for (const [source, candidate] of candidates) {
    if (typeof candidate !== 'string') continue;
    const url = candidate.trim();
    if (!url || /^data:image\//i.test(url) || /^javascript:/i.test(url)) continue;
    // URL parsing prevents accidental attempts to open a server error,
    // malformed path, or opaque provider payload. Native payment deep links
    // (alipays://, weixin://, wxp://) are valid URL schemes.
    try {
      const parsed = new URL(url);
      if (!new Set(['http:', 'https:', 'alipay:', 'alipays:', 'weixin:', 'wxp:', 'upi:', 'intent:']).has(parsed.protocol)) continue;
      return { url, source };
    } catch {
      continue;
    }
  }
  // The official server marks this response when qr_code contains the
  // dynamic Alipay precreate payload. It is intentionally handled after
  // ordinary URLs so a provider checkout URL remains the preferred action.
  if (value.alipay_mobile_precreate_deep_link && isAlipayPaymentType(value.payment_type) && typeof value.qr_code === 'string') {
    const url = buildAlipayDeepLink(value.qr_code);
    if (url) return { url, source: 'alipay_deep_link' };
  }
  const qrCode = typeof value.qr_code === 'string' ? value.qr_code.trim() : '';
  if (qrCode) {
    try {
      const parsed = new URL(qrCode);
      if (new Set(['http:', 'https:', 'alipay:', 'alipays:', 'weixin:', 'wxp:', 'upi:', 'intent:']).has(parsed.protocol)) {
        return { url: qrCode, source: 'qr_code' };
      }
    } catch {
      // Opaque QR payloads require a scanner and are deliberately unsupported
      // by this native client.
    }
  }
  return undefined;
}

export function getUserProfile() { return adminFetch<UserProfile>('/api/v1/user/profile'); }
export function updateUserProfile(body: { username?: string | null; avatar_url?: string | null; balance_notify_enabled?: boolean; balance_notify_threshold?: number | null }) {
  return adminFetch<UserProfile>('/api/v1/user', { method: 'PUT', body: JSON.stringify(body) });
}
export function changeUserPassword(oldPassword: string, newPassword: string) {
  return adminFetch<{ message: string }>('/api/v1/user/password', { method: 'PUT', body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }) });
}

export type TotpStatus = { enabled: boolean; enabled_at?: number | null; feature_enabled: boolean };
export type TotpSetup = { secret: string; qr_code_url: string; setup_token: string; countdown: number };
export function getTotpStatus() { return adminFetch<TotpStatus>('/api/v1/user/totp/status'); }
export function sendTotpVerifyCode() { return adminFetch<{ success: boolean }>('/api/v1/user/totp/send-code', { method: 'POST' }); }
export function initiateTotpSetup(body: { email_code?: string; password?: string } = {}) {
  return adminFetch<TotpSetup>('/api/v1/user/totp/setup', { method: 'POST', body: JSON.stringify(body) });
}
export function enableTotp(body: { totp_code: string; setup_token: string }) {
  return adminFetch<{ success: boolean }>('/api/v1/user/totp/enable', { method: 'POST', body: JSON.stringify(body) });
}
export function disableTotp(body: { email_code?: string; password?: string } = {}) {
  return adminFetch<{ success: boolean }>('/api/v1/user/totp/disable', { method: 'POST', body: JSON.stringify(body) });
}

export function getUserDashboardSnapshot() {
  const end = new Date(); const start = new Date(end); start.setDate(start.getDate() - 30); const format = (value: Date) => value.toISOString().slice(0, 10);
  return adminFetch<Record<string, unknown>>(`/api/v1/usage/dashboard/snapshot-v2${buildQuery({ start_date: format(start), end_date: format(end), include_trend: true, include_model_stats: true, include_stats: true })}`);
}

export function listUserApiKeys(params: { page?: number; page_size?: number; status?: string } = {}) { return adminFetch<PaginatedData<UserApiKey>>(`/api/v1/keys${buildQuery({ page: params.page ?? 1, page_size: params.page_size ?? 100, status: params.status })}`); }
export function getUserApiKey(id: number) { return adminFetch<UserApiKey>(`/api/v1/keys/${id}`); }
export function listAvailableGroups() { return adminFetch<{ id: number; name: string; platform?: string }[]>('/api/v1/groups/available'); }
export function createUserApiKey(body: { name: string; group_id?: number | null; quota?: number; expires_in_days?: number; rate_limit_5h?: number; rate_limit_1d?: number; rate_limit_7d?: number }, idempotencyKey?: string) { return adminFetch<UserApiKey>('/api/v1/keys', { method: 'POST', body: JSON.stringify(body) }, { idempotencyKey }); }
export function updateUserApiKey(id: number, body: { name?: string; status?: 'active' | 'inactive'; group_id?: number | null; quota?: number; expires_at?: string | null; reset_quota?: boolean }, idempotencyKey?: string) { return adminFetch<UserApiKey>(`/api/v1/keys/${id}`, { method: 'PUT', body: JSON.stringify(body) }, { idempotencyKey }); }
export function deleteUserApiKey(id: number, idempotencyKey?: string) { return adminFetch<{ message: string }>(`/api/v1/keys/${id}`, { method: 'DELETE' }, { idempotencyKey }); }

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
  return adminFetch<PaymentCreateResponse>('/api/v1/payment/orders', { method: 'POST', body: JSON.stringify({ ...body, is_mobile: true }) }, { idempotencyKey });
}
export function cancelPaymentOrder(id: number, idempotencyKey?: string) { return adminFetch<{ message: string }>(`/api/v1/payment/orders/${id}/cancel`, { method: 'POST' }, { idempotencyKey }); }
export function verifyPaymentOrder(outTradeNo: string) { return adminFetch<PaymentOrder>('/api/v1/payment/orders/verify', { method: 'POST', body: JSON.stringify({ out_trade_no: outTradeNo }) }); }
export function requestPaymentRefund(id: number, reason: string, idempotencyKey?: string) { return adminFetch<{ message: string }>(`/api/v1/payment/orders/${id}/refund-request`, { method: 'POST', body: JSON.stringify({ reason }) }, { idempotencyKey }); }
