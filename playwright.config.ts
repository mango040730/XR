import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results/playwright',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }], ['json', { outputFile: 'test-results/e2e-results.json' }]],
  use: {
    ...devices['Desktop Chrome'],
    // Use official full Chromium's new headless mode, rather than Headless Shell.
    channel: 'chromium',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Use Metal on macOS; Linux CI still has a software WebGL fallback.
    launchOptions: { args: process.platform === 'darwin' ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [
    { name: 'chromium', testIgnore: ['production.spec.ts','social.spec.ts'], use: { baseURL: 'http://127.0.0.1:4173' } },
    { name: 'production-chromium', testMatch: 'production.spec.ts', use: { baseURL: 'http://127.0.0.1:4174' } },
  ],
  webServer: [
    { command: 'npm run dev -- --port 4173 --strictPort --mode e2e', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
    { command: 'npm run build && npm run preview -- --port 4174 --strictPort', url: 'http://127.0.0.1:4174', reuseExistingServer: false },
  ],
});
