export type ApiEnvelope<T> = {
  code: number;
  message: string;
  reason?: string;
  metadata?: Record<string, string>;
  data?: T;
};

export type PaginatedData<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type PaginationParams = {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  sort?: string;
  order?: 'asc' | 'desc';
};

export type DashboardStats = {
  total_users: number;
  today_new_users: number;
  active_users: number;
  total_api_keys: number;
  active_api_keys: number;
  total_accounts: number;
  normal_accounts: number;
  error_accounts: number;
  total_requests: number;
  total_cost: number;
  total_tokens: number;
  today_requests: number;
  today_cost: number;
  /** Amount actually charged to users; only rendered when supplied by the Hub. */
  today_actual_cost?: number;
  /** Official reference price; never presented as revenue or actual billing. */
  today_standard_cost?: number;
  today_success_requests?: number;
  today_failed_requests?: number;
  today_tokens: number;
  today_input_tokens?: number;
  today_output_tokens?: number;
  today_cache_read_tokens?: number;
  today_cache_creation_tokens?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  total_cache_creation_tokens?: number;
  total_cache_read_tokens?: number;
  total_actual_cost?: number;
  average_duration_ms?: number;
  uptime?: number;
  ratelimit_accounts?: number;
  overload_accounts?: number;
  stats_updated_at?: string;
  stats_stale?: boolean;
  rpm: number;
  tpm: number;
};

export type TrendPoint = {
  date: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
  cost: number;
  actual_cost: number;
};

export type DashboardTrend = {
  start_date: string;
  end_date: string;
  granularity: 'day' | 'hour' | string;
  trend: TrendPoint[];
};

export type ModelStat = {
  model: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
  cost: number;
  actual_cost: number;
};

export type DashboardModelStats = {
  start_date: string;
  end_date: string;
  models: ModelStat[];
};

export type CurrencyAmounts = Record<string, number>;

export type PaymentDailyStat = {
  date: string;
  amount: CurrencyAmounts;
  count: number;
};

export type PaymentMethodStat = {
  type: string;
  amount: CurrencyAmounts;
  count: number;
};

export type PaymentTopUser = {
  user_id: number;
  email: string;
  amount: number;
};

export type PaymentDashboardStats = {
  today_amount: CurrencyAmounts;
  total_amount: CurrencyAmounts;
  today_count: number;
  total_count: number;
  avg_amount: CurrencyAmounts;
  daily_series: PaymentDailyStat[];
  payment_methods: PaymentMethodStat[];
  top_users: Record<string, PaymentTopUser[]>;
};

export type PaymentOrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'RECHARGING'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'FAILED'
  | 'REFUND_REQUESTED'
  | 'REFUNDING'
  | 'REFUND_PENDING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'REFUND_FAILED';

export type PaymentOrder = {
  id: number;
  user_id: number;
  user_email?: string;
  user_name?: string;
  amount: number;
  pay_amount: number;
  fee_rate: number;
  currency: string;
  out_trade_no: string;
  payment_type: string;
  order_type: 'balance' | 'subscription' | string;
  plan_id?: number;
  subscription_group_id?: number;
  subscription_days?: number;
  status: PaymentOrderStatus | string;
  refund_amount: number;
  refund_reason?: string;
  expires_at: string;
  paid_at?: string;
  completed_at?: string;
  failed_at?: string;
  failed_reason?: string;
  created_at: string;
  updated_at: string;
};

export type SubscriptionPlan = {
  id: number;
  group_id: number;
  group_platform?: string;
  group_name?: string;
  rate_multiplier?: number;
  daily_limit_usd?: number | null;
  weekly_limit_usd?: number | null;
  monthly_limit_usd?: number | null;
  supported_model_scopes?: string[];
  name: string;
  description: string;
  price: number;
  original_price?: number;
  currency?: string;
  validity_days: number;
  validity_unit: string;
  features: string;
  product_name?: string;
  for_sale: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type PromoCode = {
  id: number;
  code: string;
  bonus_amount: number;
  max_uses: number;
  used_count: number;
  status: 'active' | 'disabled';
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PromoCodeUsage = {
  id: number;
  promo_code_id: number;
  user_id: number;
  bonus_amount: number;
  used_at: string;
  user?: Pick<AdminUser, 'id' | 'email' | 'username'>;
};

export type CreatePromoCodeRequest = {
  code?: string;
  bonus_amount: number;
  max_uses?: number;
  expires_at?: number | null;
  notes?: string;
};

export type AuditLog = {
  id: number;
  created_at: string;
  actor_user_id?: number;
  actor_email: string;
  actor_role: string;
  auth_method: string;
  credential_masked: string;
  action: string;
  method: string;
  path: string;
  request_id: string;
  client_ip: string;
  user_agent: string;
  request_body?: string;
  status_code: number;
  latency_ms: number;
  extra?: Record<string, unknown>;
};

export type AnnouncementStatus = 'draft' | 'active' | 'archived';
export type AnnouncementNotifyMode = 'silent' | 'popup';

export type AnnouncementTargeting = {
  any_of?: {
    all_of?: {
      type: 'subscription' | 'balance';
      operator: 'in' | 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
      group_ids?: number[];
      value?: number;
    }[];
  }[];
};

export type Announcement = {
  id: number;
  title: string;
  content: string;
  status: AnnouncementStatus;
  notify_mode: AnnouncementNotifyMode;
  targeting: AnnouncementTargeting;
  starts_at?: string;
  ends_at?: string;
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
};

export type AnnouncementUserReadStatus = {
  user_id: number;
  email: string;
  username: string;
  balance: number;
  eligible: boolean;
  read_at?: string;
};

export type CreateAnnouncementRequest = {
  title: string;
  content: string;
  status?: AnnouncementStatus;
  notify_mode?: AnnouncementNotifyMode;
  targeting: AnnouncementTargeting;
  starts_at?: number;
  ends_at?: number;
};

export type UsageStats = {
  total_requests?: number;
  total_tokens?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  total_cost?: number;
  total_actual_cost?: number;
  total_account_cost?: number;
  average_duration_ms?: number;
};

export type DashboardSnapshot = {
  trend?: TrendPoint[];
  models?: ModelStat[];
  groups?: {
    group_id?: number;
    group_name?: string;
    requests?: number;
    total_tokens?: number;
    total_cost?: number;
    total_actual_cost?: number;
  }[];
};

export type AdminSettings = {
  site_name?: string;
  [key: string]: string | number | boolean | null | string[] | undefined;
};

export type AdminUser = {
  id: number;
  email: string;
  username?: string | null;
  balance?: number;
  concurrency?: number;
  status?: string;
  role?: string;
  current_concurrency?: number;
  notes?: string | null;
  last_used_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type UserUsageSummary = {
  total_requests?: number;
  total_tokens?: number;
  total_cost?: number;
  requests?: number;
  tokens?: number;
  cost?: number;
  [key: string]: string | number | boolean | null | undefined;
};

export type AdminApiKey = {
  id: number;
  user_id: number;
  key: string;
  name: string;
  group_id?: number | null;
  status: string;
  quota: number;
  quota_used: number;
  last_used_at?: string | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
  usage_5h?: number;
  usage_1d?: number;
  usage_7d?: number;
  group?: AdminGroup;
  user?: {
    id: number;
    email?: string;
    username?: string | null;
  };
};

export type BalanceOperation = 'set' | 'add' | 'subtract';

export type AdminGroup = {
  id: number;
  name: string;
  description?: string | null;
  platform: string;
  rate_multiplier?: number;
  is_exclusive?: boolean;
  status?: string;
  subscription_type?: string;
  daily_limit_usd?: number | null;
  weekly_limit_usd?: number | null;
  monthly_limit_usd?: number | null;
  account_count?: number;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type AccountTodayStats = {
  requests: number;
  tokens: number;
  cost: number;
  standard_cost?: number;
  user_cost?: number;
};

export type AdminAccount = {
  id: number;
  name: string;
  platform: string;
  type: string;
  status?: string;
  schedulable?: boolean;
  priority?: number;
  concurrency?: number;
  current_concurrency?: number;
  rate_multiplier?: number;
  load_factor?: number | null;
  notes?: string | null;
  credentials?: Record<string, unknown>;
  credentials_status?: Record<string, boolean>;
  error_message?: string;
  updated_at?: string;
  last_used_at?: string | null;
  last_success_at?: string | null;
  last_failure_at?: string | null;
  rate_limit_reset_at?: string | null;
  group_ids?: number[];
  groups?: AdminGroup[];
  extra?: Record<string, unknown>;
};

export type UpdateAccountRequest = {
  name?: string;
  notes?: string | null;
  credentials?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  proxy_id?: number | null;
  concurrency?: number;
  load_factor?: number | null;
  priority?: number;
  rate_multiplier?: number;
  schedulable?: boolean;
  status?: 'active' | 'inactive' | 'error';
  group_ids?: number[];
};

export type AvailableAccountModel = {
  id?: string;
  name?: string;
  display_name?: string;
  [key: string]: unknown;
};

export type AccountUsageStats = {
  history: { date: string; label?: string; requests: number; tokens: number; cost: number; actual_cost?: number; user_cost?: number }[];
  summary: {
    days: number;
    actual_days_used: number;
    total_cost: number;
    total_user_cost?: number;
    total_standard_cost?: number;
    total_requests: number;
    total_tokens: number;
    avg_daily_cost: number;
    avg_daily_requests: number;
    avg_daily_tokens: number;
    avg_duration_ms: number;
    today?: { date: string; cost: number; user_cost?: number; requests: number; tokens: number } | null;
  };
  models: ModelStat[];
  endpoints?: { endpoint?: string; path?: string; requests?: number; tokens?: number }[];
  upstream_endpoints?: { endpoint?: string; path?: string; requests?: number; tokens?: number }[];
};

export type UsageLog = {
  id: number;
  request_id?: string;
  user_id?: number;
  account_id?: number;
  api_key_id?: number;
  model?: string;
  request_type?: string;
  status?: string;
  status_code?: number;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_tokens?: number;
  total_tokens?: number;
  cost?: number;
  actual_cost?: number;
  duration_ms?: number;
  error_message?: string | null;
  created_at?: string;
  user?: Pick<AdminUser, 'id' | 'email' | 'username'>;
  account?: Pick<AdminAccount, 'id' | 'name' | 'platform'>;
};

export type SystemVersion = {
  version?: string;
  commit?: string;
  build_time?: string;
  uptime?: number;
};

export type AccountType = 'apikey' | 'oauth' | 'setup-token' | 'upstream';

export type CreateAccountRequest = {
  name: string;
  platform: string;
  type: AccountType;
  credentials: Record<string, unknown>;
  extra?: Record<string, unknown>;
  notes?: string;
  proxy_id?: number;
  concurrency?: number;
  load_factor?: number | null;
  priority?: number;
  rate_multiplier?: number;
  group_ids?: number[];
  expires_at?: number | null;
  auto_pause_on_expired?: boolean;
};

export type AccountTestResult = {
  success: boolean;
  message: string;
  latency_ms?: number;
};

export type CreateUserRequest = {
  email: string;
  password: string;
  username?: string;
  notes?: string;
  role?: 'user' | 'admin';
  status?: 'active' | 'disabled';
  balance?: number;
  concurrency?: number;
  [key: string]: string | number | boolean | null | undefined;
};
