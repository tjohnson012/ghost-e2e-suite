import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, // flaky tests get fixed, not retried
  globalTimeout: 15 * 60_000, // a hung run fails fast instead of eating CI minutes
  workers: process.env.CI ? 2 : 4,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.GHOST_URL ?? 'http://localhost:2368',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    // Editors work on desktop: admin flows run in Chrome + Safari.
    { name: 'chrome', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
    { name: 'safari', use: { ...devices['Desktop Safari'] }, dependencies: ['setup'] },
    // Readers use everything: member + site tests run in all four.
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, dependencies: ['setup'], testIgnore: /admin\// },
    { name: 'iphone', use: { ...devices['iPhone 15'] }, dependencies: ['setup'], testIgnore: /admin\// },
  ],
});
