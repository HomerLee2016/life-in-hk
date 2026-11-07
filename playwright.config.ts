import { defineConfig, devices } from '@playwright/test';

// Set CHROMIUM_PATH to use a pre-installed Chromium (e.g. /opt/pw-browsers/chromium).
const launchOptions = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
const base = { launchOptions };

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173/' },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop-light', use: { ...devices['Desktop Chrome'], ...base, colorScheme: 'light' } },
    { name: 'desktop-dark', use: { ...devices['Desktop Chrome'], ...base, colorScheme: 'dark' } },
    { name: 'mobile-light', use: { ...devices['Pixel 7'], ...base, colorScheme: 'light' } },
    { name: 'mobile-dark', use: { ...devices['Pixel 7'], ...base, colorScheme: 'dark' } },
  ],
});
