const { chromium } = require('@playwright/test');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const OUT = path.resolve(__dirname, '../evidence/exploration');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://rahulshettyacademy.com/client/#/auth/login', { waitUntil: 'networkidle' });
  await page.locator('#userEmail').fill('someone@example.com');
  // Explicitly clear password to trigger touched state
  await page.locator('#userPassword').click();
  await page.locator('#userPassword').fill('');
  await page.locator('#login').click();
  await page.waitForTimeout(1500);
  const result = {
    url: page.url(),
    form: await page.locator('form').innerText(),
    passwordRequired: await page.getByText('*Password is required').isVisible().catch(() => false),
    emailRequired: await page.getByText('*Email is required').isVisible().catch(() => false),
    toast: await page.locator('#toast-container .toast-message').first().textContent().catch(() => null),
    passwordClass: await page.locator('#userPassword').getAttribute('class'),
  };
  await page.screenshot({ path: path.join(OUT, '04b-login-empty-password-touched.png'), fullPage: true });

  // Also: never touch password field
  await page.goto('https://rahulshettyacademy.com/client/#/auth/login', { waitUntil: 'networkidle' });
  await page.locator('#userEmail').fill('someone@example.com');
  await page.locator('#login').click();
  await page.waitForTimeout(1500);
  result.neverTouchedPassword = {
    url: page.url(),
    form: await page.locator('form').innerText(),
    passwordRequired: await page.getByText('*Password is required').isVisible().catch(() => false),
    toast: await page.locator('#toast-container .toast-message').first().textContent().catch(() => null),
    passwordClass: await page.locator('#userPassword').getAttribute('class'),
  };
  await page.screenshot({ path: path.join(OUT, '04c-login-empty-password-untouched.png'), fullPage: true });

  // missing country toast from previous findings file if exists
  const prev = path.join(OUT, 'phase3-cart-checkout-findings.json');
  if (!fs.existsSync(prev)) {
    // quick missing country capture
  }

  fs.writeFileSync(path.join(OUT, 'phase3-empty-password-findings.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
