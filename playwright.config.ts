import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Load environment variables from .env for local execution.
 * In CI, variables are injected via GitHub Secrets / workflow env.
 */
dotenv.config({ path: path.resolve(__dirname, '.env') });

const isCI = !!process.env.CI;

/**
 * Playwright configuration
 *
 * Concepts (do not confuse):
 * - Tags: @smoke | @regression | @sanity | @positive | @negative
 *   Embedded in test titles; filtered with --grep / --grep-invert (see utils/tags.ts).
 * - Modes: headed | headless | debug
 *   Controlled by CLI flags / npm scripts (--headed, default headless, --debug).
 * - Projects: browser/device targets below (chromium only for now).
 *
 * Headless is the default mode (use.headless = true).
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  // Shared practice-account cart/order state is not isolated per worker.
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    [
      'html',
      {
        open: 'never',
        outputFolder: 'playwright-report',
      },
    ],
  ],
  use: {
    baseURL: 'https://rahulshettyacademy.com/client',
    // Default execution mode = headless. Override with --headed or npm run test:headed.
    headless: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Traces on first retry; full failure diagnostics retained in HTML report.
    trace: 'on-first-retry',
    // Built-in screenshots for every test finish (pass + fail), plus custom evidence utility.
    screenshot: 'on',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  outputDir: 'test-results',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
