import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  projects: [
    { name: 'web', testMatch: ['web.spec.ts', 'web-security-perf.spec.ts'], use: { ...devices['Desktop Chrome'] } },
    { name: 'native-web', testMatch: ['native.spec.ts', 'native-security-perf.spec.ts'], use: { ...devices['Pixel 7'] } },
    { name: 'webview', testMatch: 'webview.spec.ts', use: { ...devices['iPhone 15'], browserName: 'chromium' } },
  ],
});
