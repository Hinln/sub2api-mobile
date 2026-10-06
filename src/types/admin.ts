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
  role?: string;
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
  /** Official v0.2.13 model allowlist. Omitted in simple-mode responses. */
  model_allowlist?: {
    enabled: boolean;
    models: string[];
  };
  /** Official group routing is returned only when enabled/configured. */
  model_routing?: Record<string, number[]> | null;
  model_routing_enabled?: boolean;
  rpm_limit?: number;
  daily_limit_usd?: number | null;
  weekly_limit_usd?: number | null;
  monthly_limit_usd?: number | null;
  account_count?: number;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

/**
 * Narrow, tri-state update contract used by the official v0.2.13 handler.
 * Optional fields are deliberately omitted when the server did not return
 * them (simple mode), so the app never turns an unavailable value into zero.
 */
export type UpdateGroupRequest = {
  name?: string;
  description?: string | null;
  platform?: string;
  rate_multiplier?: number;
  is_exclusive?: boolean;
  status?: 'active' | 'inactive';
  subscription_type?: 'standard' | 'subscription';
  model_allowlist?: { enabled: boolean; models: string[] };
  model_routing?: Record<string, number[]> | null;
  model_routing_enabled?: boolean;
  rpm_limit?: number;
};

export type CreateGroupRequest = {
  name: string;
  description?: string;
  platform?: string;
  rate_multiplier?: number;
  is_exclusive?: boolean;
  subscription_type?: 'standard' | 'subscription';
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
  load_factor?: number;
  error_message?: string;
  updated_at?: string;
  last_used_at?: string | null;
  last_success_at?: string | null;
  last_failure_at?: string | null;
  rate_limit_reset_at?: string | null;
  notes?: string | null;
  /** Unix timestamp in seconds; 0/null means no expiry. */
  expires_at?: number | null;
  proxy_id?: number | null;
  auto_pause_on_expired?: boolean;
  enable_billing?: boolean;
  billing_type?: string | null;
  /** Server-sanitized non-secret credentials fields (for example model_mapping). */
  credentials?: Record<string, unknown>;
  credentials_status?: Record<string, boolean>;
  group_ids?: number[];
  groups?: AdminGroup[];
  extra?: Record<string, string | number | boolean | null>;
};

/** Fields accepted by the official v0.2.13 account update endpoint.
 * Credentials are deliberately excluded: the detail response redacts them,
 * and an update must never send an empty replacement for a hidden secret.
 */
export type UpdateAccountRequest = {
  name?: string;
  notes?: string | null;
  type?: AccountType | string;
  extra?: Record<string, string | number | boolean | null>;
  proxy_id?: number | null;
  concurrency?: number;
  priority?: number;
  rate_multiplier?: number;
  load_factor?: number;
  status?: string;
  group_ids?: number[];
  /** Unix timestamp in seconds; send 0 to clear an expiry. */
  expires_at?: number | null;
  auto_pause_on_expired?: boolean;
  enable_billing?: boolean;
  billing_type?: string | null;
};

/** Account model metadata returned by the official upstream discovery API. */
export type AdminAccountModel = {
  id?: number | string;
  model?: string;
  name?: string;
  display_name?: string;
  enabled?: boolean;
  status?: string;
  source?: string;
  context_window?: number | null;
  max_output_tokens?: number | null;
  [key: string]: unknown;
};

/** Response shape shared by the account catalogue and upstream sync endpoints. */
export type AdminAccountModelsResponse =
  | AdminAccountModel[]
  | string[]
  | {
      models?: (AdminAccountModel | string)[];
      items?: (AdminAccountModel | string)[];
      metadata?: Record<string, Partial<AdminAccountModel>>;
      warnings?: { code?: string; message?: string }[];
    };

/** Proxy metadata used by the account editor. Secrets are never returned here. */
export type AdminProxy = {
  id: number;
  name?: string;
  host?: string;
  port?: number;
  protocol?: string;
  type?: string;
  status?: string;
  enabled?: boolean;
  url?: string;
};

export type UsageLog = {
  id: number;
  request_id?: string;
  user_id?: number;
  account_id?: number;
  api_key_id?: number;
  model?: string;
  request_type?: string;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_tokens?: number;
  total_tokens?: number;
  total_cost?: number;
  actual_cost?: number;
  duration_ms?: number;
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
  credentials: Record<string, string | number | boolean | null | undefined>;
  extra?: Record<string, string | number | boolean | null | undefined>;
  notes?: string;
  proxy_id?: number;
  concurrency?: number;
  priority?: number;
  rate_multiplier?: number;
  group_ids?: number[];
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
