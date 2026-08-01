import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  retries: 1,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4173', colorScheme: 'dark', locale: 'zh-CN' },
  webServer: { command: 'npm run serve:web', url: 'http://127.0.0.1:4173', reuseExistingServer: true, timeout: 30_000 },
});
