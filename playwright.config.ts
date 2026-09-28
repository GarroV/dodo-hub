import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4329);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/dodo-hub/`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // Прод-сборка, а не dev: проверяем ровно то, что уезжает на Pages.
  webServer: {
    command: `${process.env.E2E_SKIP_BUILD ? '' : 'npm run build && '}npx astro preview --port ${PORT} --ignore-lock`,
    url: `http://localhost:${PORT}/dodo-hub/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
