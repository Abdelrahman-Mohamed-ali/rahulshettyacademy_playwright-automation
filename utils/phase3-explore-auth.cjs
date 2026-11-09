const { chromium } = require('@playwright/test');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const OUT = path.resolve(__dirname, '../evidence/exploration');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const findings = {};
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  await page.goto('https://rahulshettyacademy.com/client/#/auth/login', { waitUntil: 'networkidle' });
  await page.locator('#login').click();
  await page.waitForTimeout(700);
  findings.emptyBoth = {
    email: (await page.getByText('*Email is required').textContent()).trim(),
    password: (await page.getByText('*Password is required').textContent()).trim(),
    url: page.url(),
  };

  await page.goto('https://rahulshettyacademy.com/client/#/auth/login', { waitUntil: 'networkidle' });
  await page.locator('#userPassword').fill('SomePassword1!');
  await page.locator('#login').click();
  await page.waitForTimeout(700);
  findings.emptyEmail = {
    emailRequired: await page.getByText('*Email is required').isVisible(),
    passwordRequired: await page.getByText('*Password is required').isVisible(),
    form: (await page.locator('form').innerText()).trim(),
  };

  await page.goto('https://rahulshettyacademy.com/client/#/auth/login', { waitUntil: 'networkidle' });
  await page.locator('#userEmail').fill('someone@example.com');
  await page.locator('#login').click();
  await page.waitForTimeout(700);
  findings.emptyPassword = {
    emailRequired: await page.getByText('*Email is required').isVisible(),
    passwordRequired: await page.getByText('*Password is required').isVisible(),
    form: (await page.locator('form').innerText()).trim(),
  };

  await page.goto('https://rahulshettyacademy.com/client/#/auth/login', { waitUntil: 'networkidle' });
  await page.locator('#userEmail').fill('bad.user@example.com');
  await page.locator('#userPassword').fill('WrongPass!123');
  await page.locator('#login').click();
  await page.locator('#toast-container .toast-message').first().waitFor({ state: 'visible' });
  findings.invalidBoth = {
    toast: (await page.locator('#toast-container .toast-message').first().innerText()).trim(),
    url: page.url(),
  };

  await page.goto('https://rahulshettyacademy.com/client/#/auth/login', { waitUntil: 'networkidle' });
  await page.locator('#userEmail').fill(process.env.TEST_USERNAME);
  await page.locator('#userPassword').fill('WrongPass!999');
  await page.locator('#login').click();
  await page.locator('#toast-container .toast-message').first().waitFor({ state: 'visible' });
  findings.invalidPassword = {
    toast: (await page.locator('#toast-container .toast-message').first().innerText()).trim(),
    url: page.url(),
  };

  await page.goto('https://rahulshettyacademy.com/client/#/auth/login', { waitUntil: 'networkidle' });
  await page.locator('#userEmail').fill(process.env.TEST_USERNAME);
  await page.locator('#userPassword').fill(process.env.TEST_PASSWORD);
  await page.locator('#login').click();
  await page.waitForURL(/dashboard/);
  findings.valid = { url: page.url() };

  fs.writeFileSync(path.join(OUT, 'phase3-auth-findings.json'), JSON.stringify(findings, null, 2));
  console.log(JSON.stringify(findings, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
