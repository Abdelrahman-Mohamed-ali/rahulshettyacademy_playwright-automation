const { chromium } = require('@playwright/test');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const OUT = path.resolve(__dirname, '../evidence/exploration');
fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  console.log('screenshot', name);
}

async function login(page, user, pass) {
  await page.goto('https://rahulshettyacademy.com/client/#/auth/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#userEmail').fill(user);
  await page.locator('#userPassword').fill(pass);
  await page.locator('#login').click();
  await page.waitForURL(/dashboard/);
}

async function clearCart(page) {
  await page.goto('https://rahulshettyacademy.com/client/#/dashboard/cart');
  await Promise.race([
    page.locator('li.items').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => null),
    page.getByText('No Products in Your Cart !').waitFor({ state: 'visible', timeout: 8000 }).catch(() => null),
  ]);
  while ((await page.locator('li.items button.btn-danger').count()) > 0) {
    await page.locator('li.items button.btn-danger').first().click();
    await page.waitForTimeout(800);
  }
}

async function addProduct(page, name) {
  await page.goto('https://rahulshettyacademy.com/client/#/dashboard/dash');
  await page.locator('.card-body').filter({ visible: true }).first().waitFor({ state: 'visible' });
  const card = page
    .locator('.card-body')
    .filter({ visible: true })
    .filter({ has: page.locator('b', { hasText: new RegExp(`^${name}$`, 'i') }) });
  const prev = (await page.locator('button[routerlink="/dashboard/cart"]').innerText()).match(/(\d+)/);
  const previous = prev ? Number(prev[1]) : 0;
  await card.getByRole('button', { name: /add to cart/i }).click();
  await page.locator('#toast-container .toast-message').filter({ hasText: /product added to cart/i }).first().waitFor({ state: 'visible' });
  await page.locator('button[routerlink="/dashboard/cart"]').filter({ hasText: new RegExp(String(previous + 1)) }).waitFor({ state: 'visible', timeout: 10000 }).catch(() => null);
  await page.waitForTimeout(500);
}

(async () => {
  const findings = {};
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.setDefaultTimeout(30000);

  await login(page, process.env.TEST_USERNAME, process.env.TEST_PASSWORD);
  await clearCart(page);
  await shot(page, '09-cart-empty');

  const products = ['ADIDAS ORIGINAL', 'ZARA COAT 3', 'iphone 13 pro'];
  for (const p of products) {
    await addProduct(page, p);
    console.log('added', p, 'badge', await page.locator('button[routerlink="/dashboard/cart"]').innerText());
  }
  await shot(page, '10-products-after-multi-add');

  await page.goto('https://rahulshettyacademy.com/client/#/dashboard/cart');
  await page.locator('li.items').first().waitFor({ state: 'visible', timeout: 15000 });
  let cartNames = (await page.locator('li.items h3').allTextContents()).map((n) => n.trim());
  findings.cartProducts = cartNames;
  console.log('cartNames', cartNames);
  await shot(page, '11-cart-multi-items');

  // remove middle
  const removeTarget = cartNames[1] || cartNames[0];
  const row = page.locator('li.items').filter({ has: page.locator('h3', { hasText: removeTarget }) });
  await row.locator('button.btn-danger').click();
  await page.waitForTimeout(1000);
  const remaining = (await page.locator('li.items h3').allTextContents()).map((n) => n.trim());
  findings.removeOne = { removeTarget, remaining };
  await shot(page, '12-cart-after-remove-one');

  // checkout
  await page.getByRole('button', { name: /checkout/i }).click();
  await page.waitForURL(/dashboard\/order/);
  await page.getByText('Payment Method').waitFor({ state: 'visible' });
  await shot(page, '13-checkout-page');

  const expiryField = page.locator('.field', { hasText: 'Expiry Date' });
  const expirySelects = expiryField.locator('select');
  findings.expirySelectCount = await expirySelects.count();
  findings.monthOptions = await expirySelects.nth(0).locator('option').allTextContents();
  findings.yearOptions = await expirySelects.nth(1).locator('option').allTextContents();
  console.log('expiry', findings.expirySelectCount, findings.monthOptions.slice(0, 3), findings.yearOptions.slice(0, 3));

  // missing country
  await page.locator('.field', { hasText: 'CVV Code' }).locator('input').fill('123');
  await page.locator('.field', { hasText: 'Name on Card' }).locator('input').fill('Auto Tester');
  await page.getByPlaceholder('Select Country').fill('');
  await page.locator('a.action__submit').click();
  await page.waitForTimeout(1500);
  findings.missingCountry = {
    url: page.url(),
    toast: await page.locator('#toast-container .toast-message').first().textContent().catch(() => null),
    bodyHasError: (await page.locator('body').innerText()).slice(0, 500),
  };
  await shot(page, '16-checkout-missing-country');

  // country suggestions
  const country = page.getByPlaceholder('Select Country');
  await country.click();
  await country.fill('');
  await country.pressSequentially('ind', { delay: 70 });
  const suggestions = page.locator('.ta-results button');
  await suggestions.first().waitFor({ state: 'visible', timeout: 10000 });
  findings.suggestions = (await suggestions.allTextContents()).map((t) => t.trim());
  console.log('suggestions', findings.suggestions);
  await shot(page, '14-checkout-country-suggestions');
  await suggestions.filter({ hasText: /^\s*India\s*$/i }).first().click();
  findings.selectedCountry = await country.inputValue();
  await shot(page, '15-checkout-country-selected');

  await expirySelects.nth(0).selectOption({ label: '05' });
  await expirySelects.nth(1).selectOption({ label: '25' });
  await page.locator('.field', { hasText: 'CVV Code' }).locator('input').fill('123');
  await page.locator('.field', { hasText: 'Name on Card' }).locator('input').fill('Auto Tester');
  await shot(page, '17-checkout-filled-valid');

  await page.locator('a.action__submit').click();
  await page.waitForTimeout(3000);
  findings.confirmationUrl = page.url();
  findings.confirmationText = (await page.locator('body').innerText()).slice(0, 1500);
  findings.thankYou = (await page.getByText(/thankyou|thank you|successfully/i).allTextContents()).map((t) => t.trim());
  findings.headings = (await page.locator('h1,h2,h3,label').allTextContents()).map((t) => t.trim()).filter(Boolean).slice(0, 40);
  await shot(page, '18-order-confirmation');
  fs.writeFileSync(path.join(OUT, '18-order-confirmation.html'), await page.content());

  // empty cart remove attempt behavior note after clearing via orders done
  await page.goto('https://rahulshettyacademy.com/client/#/dashboard/cart');
  await page.waitForTimeout(1500);
  findings.cartAfterOrder = (await page.locator('body').innerText()).slice(0, 400);
  await shot(page, '19-cart-after-order');

  fs.writeFileSync(path.join(OUT, 'phase3-cart-checkout-findings.json'), JSON.stringify(findings, null, 2));
  console.log(JSON.stringify(findings, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
