import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const sizes = [
  { width: 375, height: 667 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
];

const fixedTime = new Date('2026-08-02T12:30:00+08:00');

const users = Array.from({ length: 4 }, (_, index) => ({
  id: index + 1,
  email: `operator${index + 1}@vexlune.com`,
  username: `Operator ${index + 1}`,
  balance: 50 - index * 3.5,
  concurrency: 5,
  current_concurrency: index,
  status: index === 3 ? 'disabled' : 'active',
  role: index === 0 ? 'admin' : 'user',
  last_used_at: `2026-08-02T${String(8 + index).padStart(2, '0')}:20:00+08:00`,
  created_at: '2026-08-01T10:00:00+08:00',
}));

const accounts = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  name: `${index % 2 ? 'OpenAI' : 'Claude'} Pool ${index + 1}`,
  platform: index % 2 ? 'openai' : 'anthropic',
  type: 'oauth',
  status: index === 4 ? 'error' : 'active',
  schedulable: index !== 3 && index !== 4,
  concurrency: 8,
  current_concurrency: index,
  priority: 10 - index,
  rate_multiplier: 1,
  error_message: index === 4 ? 'stream disconnected before completion' : '',
  last_used_at: `2026-08-02T${String(11 - index).padStart(2, '0')}:10:00+08:00`,
  updated_at: '2026-08-02T10:00:00+08:00',
}));

const logs = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  request_id: `req-visual-${index + 1}`,
  user_id: (index % users.length) + 1,
  account_id: (index % accounts.length) + 1,
  user: users[index % users.length],
  account: accounts[index % accounts.length],
  model: index % 2 ? 'gpt-5.2' : 'claude-sonnet-4',
  request_type: 'responses',
  status: index === 0 ? 'error' : 'success',
  status_code: index === 0 ? 503 : 200,
  input_tokens: 800 + index * 220,
  output_tokens: 400 + index * 130,
  cache_read_tokens: 180 + index * 40,
  total_tokens: 1380 + index * 390,
  cost: 0.01 + index * 0.002,
  actual_cost: 0.008 + index * 0.0015,
  duration_ms: 850 + index * 70,
  error_message: index === 0 ? 'upstream temporarily unavailable' : null,
  created_at: `2026-08-02T${String(12 - index).padStart(2, '0')}:00:00+08:00`,
}));

const models = [
  { model: 'claude-sonnet-4', requests: 816, input_tokens: 1_820_000, output_tokens: 540_000, cache_creation_tokens: 32_000, cache_read_tokens: 288_000, total_tokens: 2_680_000, cost: 9.18, actual_cost: 7.62 },
  { model: 'gpt-5.2', requests: 594, input_tokens: 1_120_000, output_tokens: 460_000, cache_creation_tokens: 0, cache_read_tokens: 190_000, total_tokens: 1_770_000, cost: 6.84, actual_cost: 5.91 },
  { model: 'gemini-2.5-pro', requests: 286, input_tokens: 430_000, output_tokens: 160_000, cache_creation_tokens: 0, cache_read_tokens: 74_000, total_tokens: 664_000, cost: 2.17, actual_cost: 1.88 },
  { model: 'claude-haiku-3.5', requests: 146, input_tokens: 188_000, output_tokens: 64_000, cache_creation_tokens: 8_000, cache_read_tokens: 31_000, total_tokens: 291_000, cost: 0.92, actual_cost: 0.73 },
];

const trend = Array.from({ length: 24 }, (_, index) => ({
  date: `2026-08-02T${String(index).padStart(2, '0')}:00:00+08:00`,
  requests: 30 + (index * 17) % 95,
  input_tokens: 32_000 + (index * 7_200) % 54_000,
  output_tokens: 12_000 + (index * 3_700) % 26_000,
  cache_creation_tokens: 1_000 + (index * 650) % 7_000,
  cache_read_tokens: 8_000 + (index * 2_900) % 22_000,
  total_tokens: 53_000 + (index * 12_400) % 91_000,
  cost: 0.2 + index * 0.03,
  actual_cost: 0.16 + index * 0.025,
}));

const paymentOrders = [
  { id: 1, user_id: 1, user_email: users[0].email, amount: 49.9, pay_amount: 49.9, fee_rate: 0, currency: 'USD', out_trade_no: 'VX-20260802-0001', payment_type: 'stripe', order_type: 'subscription', plan_id: 1, subscription_group_id: 1, subscription_days: 30, status: 'COMPLETED', refund_amount: 0, expires_at: '2026-08-02T13:00:00+08:00', paid_at: '2026-08-02T09:01:00+08:00', completed_at: '2026-08-02T09:02:00+08:00', created_at: '2026-08-02T09:00:00+08:00', updated_at: '2026-08-02T09:02:00+08:00' },
  { id: 2, user_id: 2, user_email: users[1].email, amount: 20, pay_amount: 20, fee_rate: 0, currency: 'USD', out_trade_no: 'VX-20260802-0002', payment_type: 'stripe', order_type: 'balance', status: 'PENDING', refund_amount: 0, expires_at: '2026-08-02T14:00:00+08:00', created_at: '2026-08-02T10:00:00+08:00', updated_at: '2026-08-02T10:00:00+08:00' },
  { id: 3, user_id: 3, user_email: users[2].email, amount: 10, pay_amount: 10, fee_rate: 0, currency: 'USD', out_trade_no: 'VX-20260802-0003', payment_type: 'alipay', order_type: 'balance', status: 'FAILED', refund_amount: 0, failed_at: '2026-08-02T11:03:00+08:00', failed_reason: 'payment provider timeout', expires_at: '2026-08-02T12:00:00+08:00', created_at: '2026-08-02T11:00:00+08:00', updated_at: '2026-08-02T11:03:00+08:00' },
];

const paymentPlans = [
  { id: 1, group_id: 1, group_platform: 'mixed', group_name: 'Primary', rate_multiplier: 1, daily_limit_usd: 20, weekly_limit_usd: 100, monthly_limit_usd: 300, supported_model_scopes: ['claude-*', 'gpt-*'], name: 'Vexlune Pro', description: '面向高频开发工作的专业套餐', price: 49.9, original_price: 59.9, currency: 'USD', validity_days: 30, validity_unit: '天', features: '高并发\n优先调度\n全模型访问', product_name: 'Vexlune Pro Monthly', for_sale: true, sort_order: 1 },
  { id: 2, group_id: 2, group_platform: 'openai', group_name: 'Fallback', rate_multiplier: 1.1, daily_limit_usd: 5, weekly_limit_usd: 25, monthly_limit_usd: 80, supported_model_scopes: ['gpt-*'], name: 'Vexlune Lite', description: '轻量备用套餐', price: 12.9, currency: 'USD', validity_days: 30, validity_unit: '天', features: '基础并发\nOpenAI 模型', product_name: 'Vexlune Lite Monthly', for_sale: false, sort_order: 2 },
];

const promoCodes = [
  { id: 1, code: 'VEXLUNE2026', bonus_amount: 8.88, max_uses: 100, used_count: 12, status: 'active', expires_at: '2026-12-31T23:59:59+08:00', notes: '夏季运营活动', created_at: '2026-08-01T08:00:00+08:00', updated_at: '2026-08-02T08:00:00+08:00' },
  { id: 2, code: 'WELCOME', bonus_amount: 3, max_uses: 0, used_count: 43, status: 'disabled', expires_at: null, notes: '新用户活动已结束', created_at: '2026-07-01T08:00:00+08:00', updated_at: '2026-08-01T08:00:00+08:00' },
];

const auditLogs = [
  { id: 1, created_at: '2026-08-02T11:45:00+08:00', actor_user_id: 1, actor_email: 'admin@vexlune.com', actor_role: 'admin', auth_method: 'api_key', credential_masked: 'admi...test', action: 'account.update', method: 'PUT', path: '/api/v1/admin/accounts/1', request_id: 'audit-visual-1', client_ip: '203.0.113.10', user_agent: 'Hub Vexlune iOS', request_body: '{}', status_code: 200, latency_ms: 84 },
  { id: 2, created_at: '2026-08-02T11:30:00+08:00', actor_user_id: 1, actor_email: 'admin@vexlune.com', actor_role: 'admin', auth_method: 'api_key', credential_masked: 'admi...test', action: 'promo.create', method: 'POST', path: '/api/v1/admin/promo-codes', request_id: 'audit-visual-2', client_ip: '203.0.113.10', user_agent: 'Hub Vexlune iOS', request_body: '{}', status_code: 422, latency_ms: 61 },
];

const announcements = [
  { id: 1, title: 'Hub Vexlune 维护通知', content: '系统将在本周日凌晨进行例行维护，期间模型调用可能短暂重试。', status: 'active', notify_mode: 'popup', targeting: { any_of: [] }, starts_at: '2026-08-02T00:00:00+08:00', ends_at: '2026-08-09T00:00:00+08:00', created_by: 1, updated_by: 1, created_at: '2026-08-01T18:00:00+08:00', updated_at: '2026-08-01T18:30:00+08:00' },
  { id: 2, title: '新模型灰度计划', content: '新模型将在验证完成后向部分用户开放。', status: 'draft', notify_mode: 'silent', targeting: { any_of: [] }, created_by: 1, updated_by: 1, created_at: '2026-08-02T08:00:00+08:00', updated_at: '2026-08-02T08:00:00+08:00' },
];

function paginated(items: unknown[], pageSize = 30) {
  return { items, total: items.length, page: 1, page_size: pageSize, pages: 1 };
}

function envelope(data: unknown) { return { code: 0, message: 'ok', data }; }

async function mockAdminApi(page: Page) {
  await page.route('https://hub.vexlune.com/api/v1/admin/**', async (route) => {
    const url = new URL(route.request().url());
    let data: unknown = {};
    if (url.pathname.endsWith('/settings')) data = { site_name: 'Hub Vexlune' };
    else if (url.pathname.endsWith('/dashboard/stats')) data = {
      total_users: 128,
      today_new_users: 4,
      active_users: 39,
      total_api_keys: 83,
      active_api_keys: 76,
      total_accounts: 12,
      normal_accounts: 10,
      error_accounts: 2,
      total_requests: 92_000,
      total_cost: 540,
      total_tokens: 120_000_000,
      today_requests: 1_842,
      today_success_requests: 1_809,
      today_failed_requests: 33,
      today_cost: 18.42,
      today_actual_cost: 15.66,
      today_standard_cost: 21.08,
      today_tokens: 4_830_000,
      today_input_tokens: 3_510_000,
      today_output_tokens: 1_320_000,
      today_cache_creation_tokens: 83_000,
      today_cache_read_tokens: 612_000,
      average_duration_ms: 914,
      stats_updated_at: fixedTime.toISOString(),
      stats_stale: false,
      rpm: 26,
      tpm: 64_000,
    };
    else if (url.pathname.endsWith('/dashboard/trend')) data = { start_date: '2026-08-02', end_date: '2026-08-02', granularity: 'hour', trend };
    else if (url.pathname.endsWith('/dashboard/models')) data = { start_date: '2026-08-02', end_date: '2026-08-02', models };
    else if (url.pathname.endsWith('/usage/stats')) data = { total_requests: 1_842, total_tokens: 4_830_000, total_cost: 18.42, total_actual_cost: 15.66, average_duration_ms: 914 };
    else if (url.pathname.endsWith('/system/version')) data = { version: 'v1.8.0', uptime: 86400 };
    else if (url.pathname.endsWith('/payment/dashboard')) data = {
      today_amount: { USD: 128.5 },
      total_amount: { USD: 12_840.75 },
      today_count: 7,
      total_count: 642,
      avg_amount: { USD: 20.0 },
      daily_series: ['2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02'].map((date, index) => ({ date, amount: { USD: 80 + index * 8.5 }, count: 3 + index })),
      payment_methods: [{ type: 'stripe', amount: { USD: 9_540.5 }, count: 481 }, { type: 'alipay', amount: { USD: 3_300.25 }, count: 161 }],
      top_users: { USD: [{ user_id: 1, email: users[0].email, amount: 680.5 }, { user_id: 2, email: users[1].email, amount: 412.25 }] },
    };
    else if (url.pathname.endsWith('/payment/orders')) {
      const status = url.searchParams.get('status');
      const keyword = url.searchParams.get('keyword')?.toLowerCase();
      const filtered = paymentOrders.filter((order) => (!status || order.status === status) && (!keyword || `${order.out_trade_no} ${order.user_email}`.toLowerCase().includes(keyword)));
      data = paginated(filtered);
    }
    else if (url.pathname.endsWith('/payment/plans')) data = paymentPlans;
    else if (/\/promo-codes\/\d+\/usages$/.test(url.pathname)) data = paginated([{ id: 1, promo_code_id: 1, user_id: 1, bonus_amount: 8.88, used_at: '2026-08-02T09:20:00+08:00', user: users[0] }], 50);
    else if (url.pathname.endsWith('/promo-codes')) {
      const status = url.searchParams.get('status');
      const search = url.searchParams.get('search')?.toLowerCase();
      const filtered = promoCodes.filter((item) => (!status || item.status === status) && (!search || `${item.code} ${item.notes ?? ''}`.toLowerCase().includes(search)));
      data = paginated(filtered);
    }
    else if (url.pathname.endsWith('/audit-logs')) {
      const success = url.searchParams.get('success');
      const filtered = auditLogs.filter((item) => success === null || (success === 'true' ? item.status_code < 400 : item.status_code >= 400));
      data = paginated(filtered);
    }
    else if (/\/announcements\/\d+\/read-status$/.test(url.pathname)) data = paginated([{ user_id: 1, email: users[0].email, username: users[0].username, balance: users[0].balance, eligible: true, read_at: '2026-08-02T10:00:00+08:00' }, { user_id: 2, email: users[1].email, username: users[1].username, balance: users[1].balance, eligible: true }], 50);
    else if (url.pathname.endsWith('/announcements')) {
      const status = url.searchParams.get('status');
      const search = url.searchParams.get('search')?.toLowerCase();
      const filtered = announcements.filter((item) => (!status || item.status === status) && (!search || `${item.title} ${item.content}`.toLowerCase().includes(search)));
      data = paginated(filtered);
    }
    else if (/\/accounts\/\d+\/models$/.test(url.pathname)) data = models.map(({ model }) => ({ id: model, name: model, display_name: model }));
    else if (/\/accounts\/\d+\/today-stats$/.test(url.pathname)) data = { requests: 182, tokens: 483_000, cost: 1.84, standard_cost: 2.12, user_cost: 1.63 };
    else if (/\/accounts\/\d+\/stats$/.test(url.pathname)) data = {
      history: trend.slice(-7).map((item) => ({ date: item.date, requests: item.requests, tokens: item.total_tokens, cost: item.cost, actual_cost: item.actual_cost })),
      summary: { days: 30, actual_days_used: 30, total_cost: 42.8, total_user_cost: 38.2, total_standard_cost: 47.1, total_requests: 4_320, total_tokens: 9_840_000, avg_daily_cost: 1.43, avg_daily_requests: 144, avg_daily_tokens: 328_000, avg_duration_ms: 914 },
      models,
      endpoints: [],
      upstream_endpoints: [],
    };
    else if (/\/accounts\/\d+$/.test(url.pathname)) data = accounts.find((account) => account.id === Number(url.pathname.split('/').at(-1))) ?? accounts[0];
    else if (url.pathname.endsWith('/accounts')) data = { items: accounts, total: accounts.length, page: 1, page_size: 30, pages: 1 };
    else if (url.pathname.endsWith('/users')) data = { items: users, total: users.length, page: 1, page_size: 30, pages: 1 };
    else if (url.pathname.endsWith('/usage')) data = { items: logs, total: logs.length, page: 1, page_size: 30, pages: 1 };
    else if (url.pathname.endsWith('/groups')) data = { items: [{ id: 1, name: 'Primary', platform: 'mixed', status: 'active', account_count: 8, rate_multiplier: 1, sort_order: 1 }, { id: 2, name: 'Fallback', platform: 'openai', status: 'active', account_count: 4, rate_multiplier: 1.1, sort_order: 2 }], total: 2, page: 1, page_size: 100, pages: 1 };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(data)) });
  });
}

async function assertNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

async function capture(page: Page, folder: string, name: string) {
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: path.join(folder, `${name}.png`), fullPage: true, animations: 'disabled' });
}

async function assertFourPrimaryTabs(page: Page) {
  const tabList = page.getByRole('tablist');
  await expect(tabList).toBeVisible();
  await expect(tabList.getByRole('tab')).toHaveCount(4);
  for (const label of ['概览', '用户', '账号', '更多']) {
    await expect(tabList.getByRole('tab', { name: label, exact: true })).toHaveCount(1);
  }
  await expect(tabList.getByRole('tab', { name: '日志', exact: true })).toHaveCount(0);
}

for (const size of sizes) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test('mobile visual acceptance', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
      await page.clock.setFixedTime(fixedTime);
      await mockAdminApi(page);
      const folder = path.join('artifacts', 'screenshots', `${size.width}x${size.height}`);
      await page.goto('/');
      const brand = page.getByText('Hub Vexlune', { exact: true }).first();
      try {
        await expect(brand).toBeVisible({ timeout: 15_000 });
      } catch {
        throw new Error(`App did not render at ${page.url()}; console=${errors.join(' | ')}; body=${await page.locator('body').innerText()}`);
      }
      await capture(page, folder, 'login');

      await page.getByLabel('admin-token').fill('admin-visual-test-token');
      await page.getByLabel('connect').click();
      await expect(page.getByText('Hub 运行正常', { exact: true })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('Hub Vexlune · v1.8.0', { exact: true })).toBeVisible();
      await expect(page.getByText('claude-sonnet-4', { exact: true }).first()).toBeVisible();
      await assertFourPrimaryTabs(page);
      await capture(page, folder, 'dashboard');

      const tabList = page.getByRole('tablist');
      for (const [label, expectedText, file] of [
        ['用户', 'operator1@vexlune.com', 'users'],
        ['账号', 'Claude Pool 1', 'accounts'],
        ['更多', '请求日志', 'more'],
      ] as const) {
        await tabList.getByRole('tab', { name: label, exact: true }).click();
        await expect(page.getByText(expectedText, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
        await assertFourPrimaryTabs(page);
        await capture(page, folder, file);
      }

      await page.getByRole('button', { name: '请求日志', exact: true }).click();
      await expect(page.getByText('请求日志', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('operator1@vexlune.com · Claude Pool 1', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('upstream temporarily unavailable', { exact: true }).first()).toBeVisible();
      await assertFourPrimaryTabs(page);
      await capture(page, folder, 'logs');

      expect(errors.filter((value) => !value.includes('favicon'))).toEqual([]);
    });
  });
}

test.describe('capability modules', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test('More opens verified operational capability data and interactions', async ({ page }) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.clock.setFixedTime(fixedTime);
    await mockAdminApi(page);

    await page.goto('/');
    await expect(page.getByLabel('admin-token')).toBeVisible({ timeout: 15_000 });
    await page.getByLabel('admin-token').fill('admin-capability-test-token');
    await page.getByLabel('connect').click();
    await expect(page.getByText('Hub 运行正常', { exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('tablist').getByRole('tab', { name: '更多', exact: true }).click();
    await expect(page.getByText('财务中心', { exact: true })).toBeVisible();

    const backToMore = async () => {
      await page.getByRole('button', { name: '返回', exact: true }).click();
      await expect(page.getByText('财务中心', { exact: true })).toBeVisible();
      await assertFourPrimaryTabs(page);
    };

    await page.getByRole('button', { name: '财务中心', exact: true }).click();
    await expect(page.getByText('今日实收', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('USD 128.50', { exact: true })).toBeVisible();
    await capture(page, path.join('artifacts', 'screenshots', '393x852'), 'finance');
    await backToMore();

    await page.getByRole('button', { name: '订单管理', exact: true }).click();
    await expect(page.getByText('VX-20260802-0001', { exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: '失败', exact: true }).click();
    await expect(page.getByText('VX-20260802-0003', { exact: true })).toBeVisible();
    await expect(page.getByText('VX-20260802-0001', { exact: true })).toHaveCount(0);
    await capture(page, path.join('artifacts', 'screenshots', '393x852'), 'orders');
    await backToMore();

    await page.getByRole('button', { name: '套餐管理', exact: true }).click();
    await expect(page.getByText('Vexlune Pro', { exact: true })).toBeVisible({ timeout: 15_000 });
    await backToMore();

    await page.getByRole('button', { name: '优惠码', exact: true }).click();
    await expect(page.getByText('VEXLUNE2026', { exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByText('VEXLUNE2026', { exact: true }).click();
    await expect(page.getByText('使用记录 · VEXLUNE2026', { exact: true })).toBeVisible();
    await expect(page.getByText(users[0].email, { exact: true }).first()).toBeVisible();
    await page.getByLabel('关闭').click();
    await backToMore();

    await page.getByRole('button', { name: '操作日志', exact: true }).click();
    await expect(page.getByText('account.update', { exact: true })).toBeVisible({ timeout: 15_000 });
    await backToMore();

    await page.getByRole('button', { name: '公告', exact: true }).click();
    await expect(page.getByText('Hub Vexlune 维护通知', { exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByText('Hub Vexlune 维护通知', { exact: true }).click();
    await expect(page.getByText('阅读情况', { exact: true })).toBeVisible();
    await expect(page.getByText(users[0].email, { exact: true }).first()).toBeVisible();
    await page.getByLabel('关闭').click();
    await backToMore();

    await page.getByRole('button', { name: '模型分析', exact: true }).click();
    await expect(page.getByText('Token 消耗排行', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('claude-sonnet-4', { exact: true }).last()).toBeVisible();
    await backToMore();

    expect(errors.filter((value) => !value.includes('favicon'))).toEqual([]);
  });
});
