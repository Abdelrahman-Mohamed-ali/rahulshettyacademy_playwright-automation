/**
 * Capture screenshots of the generated Playwright HTML report using
 * `playwright show-report` on an ephemeral port.
 *
 * Usage:
 *   node utils/capture-report-screenshots.cjs
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('@playwright/test');

const REPORT_DIR = path.resolve(__dirname, '../playwright-report');
const OUT_DIR = path.resolve(__dirname, '../evidence/reports/html');
const HOST = '127.0.0.1';
const PORT = 9335;

function waitForServer(url, timeoutMs = 45000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Timed out waiting for report server at ${url}`));
          return;
        }
        setTimeout(attempt, 400);
      });
    };
    attempt();
  });
}

async function shot(page, name) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log('saved', file, 'bytes=', fs.statSync(file).size);
  return file;
}

async function clickByText(page, pattern) {
  const locator = page.getByText(pattern).first();
  if ((await locator.count()) === 0) return false;
  await locator.click({ timeout: 5000 }).catch(() => undefined);
  return true;
}

async function main() {
  if (!fs.existsSync(path.join(REPORT_DIR, 'index.html'))) {
    console.error(
      `HTML report not found at ${REPORT_DIR}. Run tests first (npx playwright test ...).`
    );
    process.exit(1);
  }

  const showReport = spawn(
    `npx playwright show-report "${REPORT_DIR}" --host ${HOST} --port ${PORT}`,
    {
      cwd: path.resolve(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    }
  );

  let serverLog = '';
  showReport.stdout.on('data', (chunk) => {
    serverLog += chunk.toString();
    process.stdout.write(chunk);
  });
  showReport.stderr.on('data', (chunk) => {
    serverLog += chunk.toString();
    process.stderr.write(chunk);
  });

  const baseUrl = `http://${HOST}:${PORT}`;
  const summary = {
    overview: null,
    passedView: null,
    failedView: null,
    positiveSearch: null,
    negativeSearch: null,
    bodySnippet: '',
    notes: [],
    serverLog: '',
    baseUrl,
  };

  try {
    await waitForServer(`${baseUrl}/`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    try {
      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2500);
      await page.waitForFunction(() => (document.body?.innerText || '').length > 80, null, {
        timeout: 20000,
      });

      summary.bodySnippet = (await page.locator('body').innerText()).slice(0, 1000);
      summary.overview = await shot(page, '01-report-overview');

      if (await clickByText(page, /\bPassed\b/i)) {
        await page.waitForTimeout(800);
        summary.passedView = await shot(page, '02-report-passed-filter');
      } else {
        summary.notes.push('Passed filter control not found.');
      }

      // HTML report chips may render as "Failed1" (no space) or "1 Failed".
      const failedCountMatch =
        summary.bodySnippet.match(/\bFailed\s*([1-9]\d*)\b/i) ||
        summary.bodySnippet.match(/\b([1-9]\d*)\s+Failed\b/i);
      if (failedCountMatch) {
        if (await clickByText(page, /Failed\s*[1-9]/i)) {
          await page.waitForTimeout(800);
          summary.failedView = await shot(page, '03-report-failed-filter');
        } else if (await clickByText(page, /\bFailed\b/i)) {
          await page.waitForTimeout(800);
          summary.failedView = await shot(page, '03-report-failed-filter');
        } else {
          summary.notes.push('Failed tests appear present but filter click failed.');
          summary.failedView = await shot(page, '03-report-failed-overview-fallback');
        }
      } else {
        summary.notes.push(
          'No failed tests available in this report run; failed-view screenshot was not generated.'
        );
      }

      const search = page
        .locator('input[type="search"], input[placeholder*="Search" i], input[placeholder*="Filter" i]')
        .first();
      if (await search.count()) {
        await search.fill('@positive');
        await page.waitForTimeout(900);
        summary.positiveSearch = await shot(page, '04-report-positive-search');
        await search.fill('@negative');
        await page.waitForTimeout(900);
        summary.negativeSearch = await shot(page, '05-report-negative-search');
        await search.fill('');
      } else {
        summary.notes.push('No search input found for Positive/Negative filtering.');
        summary.positiveSearch = await shot(page, '04-report-positive-overview-fallback');
        summary.negativeSearch = await shot(page, '05-report-negative-overview-fallback');
      }
    } finally {
      await browser.close();
    }
  } finally {
    summary.serverLog = serverLog.slice(0, 1500);
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(showReport.pid), '/T', '/F'], { shell: true });
      } else {
        showReport.kill('SIGTERM');
      }
    } catch {
      // ignore
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'capture-summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
