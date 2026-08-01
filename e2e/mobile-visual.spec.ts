import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const sizes = [
  { width: 375, height: 667 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
];

const users = Array.from({ length: 4 }, (_, index) => ({ id: index + 1, email: `operator${index + 1}@vexlune.com`, username: `Operator ${index + 1}`, balance: 50 - index * 3.5, concurrency: 5, current_concurrency: index, status: index === 3 ? 'disabled' : 'active', role: index === 0 ? 'admin' : 'user', created_at: '2026-08-01T10:00:00Z' }));
const accounts = Array.from({ length: 5 }, (_, index) => ({ id: index + 1, name: `Claude Pool ${index + 1}`, platform: index % 2 ? 'openai' : 'anthropic', type: 'oauth', status: index === 4 ? 'error' : 'active', schedulable: index !== 3, concurrency: 8, current_concurrency: index, priority: 10 - index, rate_multiplier: 1, error_message: index === 4 ? 'stream disconnected before completion' : '', updated_at: '2026-08-02T10:00:00Z' }));
const logs = Array.from({ length: 6 }, (_, index) => ({ id: index + 1, request_id: `req-visual-${index + 1}`, model: index % 2 ? 'gpt-5.2' : 'claude-sonnet-4', request_type: 'responses', status: index === 0 ? 'error' : 'success', status_code: index === 0 ? 503 : 200, total_tokens: 1200 + index * 350, cost: 0.01 + index * 0.002, duration_ms: 850 + index * 70, error_message: index === 0 ? 'upstream temporarily unavailable' : null, created_at: '2026-08-02T12:00:00Z' }));

function envelope(data: unknown) { return { code: 0, message: 'ok', data }; }

async function mockAdminApi(page: Page) {
  await page.route('https://hub.vexlune.com/api/v1/admin/**', async (route) => {
    const url = new URL(route.request().url());
    let data: unknown = {};
    if (url.pathname.endsWith('/settings')) data = { site_name: 'Vexlune Hub' };
    else if (url.pathname.endsWith('/dashboard/stats')) data = { total_users: 128, today_new_users: 4, active_users: 39, total_api_keys: 83, active_api_keys: 76, total_accounts: 12, normal_accounts: 10, error_accounts: 2, total_requests: 92000, total_cost: 540, total_tokens: 120000000, today_requests: 1842, today_cost: 18.42, today_tokens: 4830000, today_input_tokens: 3510000, today_output_tokens: 1320000, rpm: 26, tpm: 64000 };
    else if (url.pathname.endsWith('/dashboard/trend')) data = { start_date: '2026-08-01', end_date: '2026-08-02', granularity: 'hour', trend: Array.from({ length: 24 }, (_, i) => ({ date: `2026-08-02T${String(i).padStart(2, '0')}:00:00Z`, requests: 30 + (i * 17) % 95, input_tokens: 1000, output_tokens: 500, cache_creation_tokens: 0, cache_read_tokens: 300, total_tokens: 1800, cost: 0.2, actual_cost: 0.1 })) };
    else if (url.pathname.endsWith('/system/version')) data = { version: 'v1.8.0', uptime: 86400 };
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

for (const size of sizes) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test('mobile visual acceptance', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      await mockAdminApi(page);
      const folder = path.join('artifacts', 'screenshots', `${size.width}x${size.height}`);
      await page.goto('/');
      await page.waitForTimeout(3_000);
      if (await page.getByText('Vexlune', { exact: true }).count() === 0) {
        throw new Error(`App did not render at ${page.url()}; console=${errors.join(' | ')}; body=${await page.locator('body').innerText()}`);
      }
      await expect(page.getByText('Vexlune', { exact: true })).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await page.screenshot({ path: path.join(folder, 'login.png'), fullPage: true });

      await page.getByLabel('admin-token').fill('admin-visual-test-token');
      await page.getByLabel('connect').click();
      await expect(page.getByText('\u6982\u89c8', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
      await assertNoHorizontalOverflow(page);
      await page.screenshot({ path: path.join(folder, 'dashboard.png'), fullPage: true });

      for (const [label, file] of [['\u7528\u6237', 'users'], ['\u8d26\u53f7', 'accounts'], ['\u65e5\u5fd7', 'logs'], ['\u66f4\u591a', 'more']] as const) {
        await page.getByText(label, { exact: true }).last().click();
        await page.waitForTimeout(250);
        await assertNoHorizontalOverflow(page);
        await page.screenshot({ path: path.join(folder, `${file}.png`), fullPage: true });
      }
      expect(errors.filter((value) => !value.includes('favicon'))).toEqual([]);
    });
  });
}
