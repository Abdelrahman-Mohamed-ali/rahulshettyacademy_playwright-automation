/**
 * Capture screenshots of the generated Playwright HTML report.
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

const SERVER_START_TIMEOUT = 45000;
const SERVER_STOP_TIMEOUT = 3000;

function waitForServer(url, child, timeoutMs = SERVER_START_TIMEOUT) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (child.exitCode !== null || child.signalCode !== null) {
        reject(new Error('Playwright report server exited before becoming ready.'));
        return;
      }

      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for report server at ${url}`));
        return;
      }

      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });

      req.setTimeout(3000, () => req.destroy());

      req.on('error', () => {
        setTimeout(attempt, 400);
      });
    };

    attempt();
  });
}

async function shot(page, name) {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const file = path.join(OUT_DIR, `${name}.png`);

  await page.screenshot({
    path: file,
    fullPage: true,
  });

  console.log('saved', file, 'bytes=', fs.statSync(file).size);

  return file;
}

async function clickByText(page, pattern) {
  const locator = page.getByText(pattern).first();

  if ((await locator.count()) === 0) {
    return false;
  }

  await locator.click({ timeout: 5000 }).catch(() => undefined);

  return true;
}

/**
 * Start the report server without shell wrapping.
 */
function startReportServer() {
  const child = spawn(
    'npx',
    [
      'playwright',
      'show-report',
      REPORT_DIR,
      '--host',
      HOST,
      '--port',
      String(PORT),
    ],
    {
      cwd: path.resolve(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      detached: process.platform !== 'win32',
    }
  );

  const exitPromise = new Promise((resolve) => {
    child.once('close', (code, signal) => {
      resolve({ code, signal });
    });

    child.once('error', (error) => {
      resolve({ error: error.message });
    });
  });

  return { child, exitPromise };
}

/**
 * Stop the report server and its child processes.
 */
async function stopReportServer(child, exitPromise) {
  if (!child.pid) {
    return;
  }

  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  console.log('Stopping Playwright report server...');

  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
    } else {
      process.kill(-child.pid, 'SIGTERM');
    }
  } catch {
    // Process may already be stopped.
  }

  const closed = await Promise.race([
    exitPromise.then(() => true),
    new Promise((resolve) => {
      setTimeout(() => resolve(false), SERVER_STOP_TIMEOUT);
    }),
  ]);

  if (!closed) {
    console.warn('Graceful shutdown timed out. Forcing process termination.');

    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
      } else {
        process.kill(-child.pid, 'SIGKILL');
      }
    } catch {
      // Ignore cleanup errors.
    }

    await Promise.race([
      exitPromise,
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
  }

  console.log('Report server shutdown completed.');
}

async function main() {
  if (!fs.existsSync(path.join(REPORT_DIR, 'index.html'))) {
    throw new Error(
      `HTML report not found at ${REPORT_DIR}. Run Playwright tests first.`
    );
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const summary = {
    overview: null,
    passedView: null,
    failedView: null,
    positiveSearch: null,
    negativeSearch: null,
    bodySnippet: '',
    notes: [],
    serverLog: '',
    baseUrl: `http://${HOST}:${PORT}`,
  };

  let serverLog = '';
  let browser = null;
  let server = null;

  try {
    console.log('Starting Playwright report server...');

    server = startReportServer();

    const { child, exitPromise } = server;

    child.stdout.on('data', (chunk) => {
      serverLog += chunk.toString();
      process.stdout.write(chunk);
    });

    child.stderr.on('data', (chunk) => {
      serverLog += chunk.toString();
      process.stderr.write(chunk);
    });

    await waitForServer(summary.baseUrl, child);

    console.log('Report server is ready.');

    browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage({
      viewport: {
        width: 1440,
        height: 900,
      },
    });

    await page.goto(summary.baseUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForTimeout(1500);

    await page.waitForFunction(
      () => (document.body?.innerText || '').length > 80,
      null,
      { timeout: 15000 }
    );

    summary.bodySnippet = (
      await page.locator('body').innerText()
    ).slice(0, 1000);

    // 01 - Overview
    summary.overview = await shot(page, '01-report-overview');

    // 02 - Passed tests
    if (await clickByText(page, /\\bPassed\\b/i)) {
      await page.waitForTimeout(500);

      summary.passedView = await shot(
        page,
        '02-report-passed-filter'
      );
    } else {
      summary.notes.push('Passed filter control not found.');
    }

    // 03 - Failed tests
    const failedCountMatch =
      summary.bodySnippet.match(/\\bFailed\\s*([1-9]\\d*)\\b/i) ||
      summary.bodySnippet.match(/\\b([1-9]\\d*)\\s+Failed\\b/i);

    if (failedCountMatch) {
      if (
        await clickByText(page, /Failed\\s*[1-9]/i) ||
        await clickByText(page, /\\bFailed\\b/i)
      ) {
        await page.waitForTimeout(500);

        summary.failedView = await shot(
          page,
          '03-report-failed-filter'
        );
      } else {
        summary.notes.push(
          'Failed tests exist but filter click failed.'
        );

        summary.failedView = await shot(
          page,
          '03-report-failed-overview-fallback'
        );
      }
    } else {
      summary.notes.push(
        'No failed tests available in this report run.'
      );
    }

    // 04 & 05 - Positive / Negative search
    const search = page
      .locator(
        'input[type="search"], input[placeholder*="Search" i], input[placeholder*="Filter" i]'
      )
      .first();

    if (await search.count()) {
      await search.fill('@positive');
      await page.waitForTimeout(500);

      summary.positiveSearch = await shot(
        page,
        '04-report-positive-search'
      );

      await search.fill('@negative');
      await page.waitForTimeout(500);

      summary.negativeSearch = await shot(
        page,
        '05-report-negative-search'
      );

      await search.fill('');
    } else {
      summary.notes.push(
        'No search input found for Positive/Negative filtering.'
      );

      summary.positiveSearch = await shot(
        page,
        '04-report-positive-overview-fallback'
      );

      summary.negativeSearch = await shot(
        page,
        '05-report-negative-overview-fallback'
      );
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }

    if (server) {
      summary.serverLog = serverLog.slice(0, 1500);

      await stopReportServer(
        server.child,
        server.exitPromise
      );
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });

    fs.writeFileSync(
      path.join(OUT_DIR, 'capture-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log(JSON.stringify(summary, null, 2));
  }
}

main().catch((error) => {
  console.error('Report capture failed:', error);
  process.exitCode = 1;
});
