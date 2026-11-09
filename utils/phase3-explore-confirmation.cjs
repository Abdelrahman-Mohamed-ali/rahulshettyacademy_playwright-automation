const { chromium } = require('@playwright/test');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const OUT = path.resolve(__dirname, '../evidence/exploration');

async function loginAndCheckoutToConfirmation(page) {
  await page.goto('https://rahulshettyacademy.com/client/#/auth/login');
  await page.locator('#userEmail').fill(process.env.TEST_USERNAME);
  await page.locator('#userPassword').fill(process.env.TEST_PASSWORD);
  await page.locator('#login').click();
  await page.waitForURL(/dashboard/);

  // clear cart
  await page.goto('https://rahulshettyacademy.com/client/#/dashboard/cart');
  await page.waitForTimeout(1200);
  while ((await page.locator('li.items button.btn-danger').count()) > 0) {
    await page.locator('li.items button.btn-danger').first().click();
    await page.waitForTimeout(700);
  }

  await page.goto('https://rahulshettyacademy.com/client/#/dashboard/dash');
  await page.locator('.card-body').filter({ visible: true }).first().waitFor({ state: 'visible' });
  const card = page.locator('.card-body').filter({ visible: true }).filter({ has: page.locator('b', { hasText: /zara coat 3/i }) });
  await card.getByRole('button', { name: /add to cart/i }).click();
  await page.locator('#toast-container .toast-message').filter({ hasText: /product added to cart/i }).first().waitFor({ state: 'visible' });

  await page.goto('https://rahulshettyacademy.com/client/#/dashboard/cart');
  await page.locator('li.items').first().waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /checkout/i }).click();
  await page.waitForURL(/dashboard\/order/);

  await page.locator('.field', { hasText: 'CVV Code' }).locator('input').fill('123');
  await page.locator('.field', { hasText: 'Name on Card' }).locator('input').fill('Auto Tester');
  const expiry = page.locator('.field', { hasText: 'Expiry Date' }).locator('select');
  await expiry.nth(0).selectOption({ label: '05' });
  await expiry.nth(1).selectOption({ label: '25' });

  const country = page.getByPlaceholder('Select Country');
  await country.click();
  await country.pressSequentially('ind', { delay: 60 });
  await page.locator('.ta-results button').filter({ hasText: /^\s*India\s*$/i }).first().click();
  await page.locator('a.action__submit').click();
  await page.waitForURL(/thanks|confirmation|order|dashboard/i, { timeout: 20000 }).catch(() => null);
  await page.waitForTimeout(2000);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await loginAndCheckoutToConfirmation(page);

  const root = page.locator('app-thanksorder, .content, section').first();
  await page.screenshot({ path: path.join(OUT, '18-order-confirmation.png'), fullPage: true });

  const findings = {
    url: page.url(),
    appThanksCount: await page.locator('app-thanksorder').count(),
    text: (await page.locator('app-thanksorder').innerText().catch(async () => page.locator('.hero-content, .content').first().innerText())).slice(0, 2000),
    headings: await page.locator('app-thanksorder h1, app-thanksorder h2, app-thanksorder h3, app-thanksorder label').allTextContents().catch(() => []),
    links: await page.locator('app-thanksorder a, app-thanksorder button').allTextContents().catch(() => []),
  };

  // missing country behavior quick check on new checkout if needed already known
  fs.writeFileSync(path.join(OUT, '18-order-confirmation.html'), await page.content());
  fs.writeFileSync(path.join(OUT, 'phase3-confirmation-findings.json'), JSON.stringify(findings, null, 2));
  console.log(JSON.stringify(findings, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
