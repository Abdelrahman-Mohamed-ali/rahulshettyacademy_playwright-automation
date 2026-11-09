/**
 * Phase 3 exploration — captures live behaviors + screenshots.
 * Temporary utility; safe to keep for re-runs during design.
 */
const { chromium } = require('@playwright/test');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const OUT = path.resolve(__dirname, '../evidence/exploration');
fs.mkdirSync(OUT, { recursive: true });

const findings = {
  auth: {},
  products: {},
  cart: {},
  checkout: {},
  confirmation: {},
  notes: [],
};

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log('screenshot', name);
  return file;
}

async function login(page, email, password) {
  await page.goto('https://rahulshettyacademy.com/client/#/auth/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#userEmail').waitFor({ state: 'visible' });
  await page.locator('#userEmail').fill(email);
  await page.locator('#userPassword').fill(password);
  await page.locator('#login').click();
}

async function main() {
  const username = process.env.TEST_USERNAME;
  const password = process.env.TEST_PASSWORD;
  if (!username || !password) throw new Error('Missing credentials');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.setDefaultTimeout(30000);

  // ---------- AUTH ----------
  await page.goto('https://rahulshettyacademy.com/client/#/auth/login', { waitUntil: 'networkidle' });
  await shot(page, '01-login-page');

  // empty both
  await page.locator('#login').click();
  await page.waitForTimeout(800);
  findings.auth.emptyBoth = {
    emailError: await page.getByText('*Email is required').isVisible().catch(() => false),
    passwordError: await page.getByText('*Password is required').isVisible().catch(() => false),
    emailErrorText: (await page.getByText('*Email is required').textContent().catch(() => null) || '').trim(),
    passwordErrorText: (await page.getByText('*Password is required').textContent().catch(() => null) || '').trim(),
    url: page.url(),
  };
  await shot(page, '02-login-empty-both');

  // empty email only
  await page.goto('https://rahulshettyacademy.com/client/#/auth/login', { waitUntil: 'networkidle' });
  await page.locator('#userPassword').fill('SomePassword1!');
  await page.locator('#login').click();
  await page.waitForTimeout(800);
  findings.auth.emptyEmail = {
    emailErrorVisible: await page.getByText('*Email is required').isVisible().catch(() => false),
    passwordErrorVisible: await page.getByText('*Password is required').isVisible().catch(() => false),
    formText: (await page.locator('form').innerText()).trim(),
    url: page.url(),
  };
  await shot(page, '03-login-empty-email');

  // empty password only
  await page.goto('https://rahulshettyacademy.com/client/#/auth/login', { waitUntil: 'networkidle' });
  await page.locator('#userEmail').fill('someone@example.com');
  await page.locator('#login').click();
  await page.waitForTimeout(800);
  findings.auth.emptyPassword = {
    emailErrorVisible: await page.getByText('*Email is required').isVisible().catch(() => false),
    passwordErrorVisible: await page.getByText('*Password is required').isVisible().catch(() => false),
    formText: (await page.locator('form').innerText()).trim(),
    url: page.url(),
  };
  await shot(page, '04-login-empty-password');

  // invalid credentials
  await page.goto('https://rahulshettyacademy.com/client/#/auth/login', { waitUntil: 'networkidle' });
  await page.locator('#userEmail').fill('bad.user@example.com');
  await page.locator('#userPassword').fill('WrongPass!123');
  await page.locator('#login').click();
  const toast = page.locator('#toast-container .toast-message');
  await toast.first().waitFor({ state: 'visible', timeout: 8000 });
  findings.auth.invalidCredentials = {
    toast: (await toast.first().innerText()).trim(),
    url: page.url(),
  };
  await shot(page, '05-login-invalid-credentials');

  // invalid email format-ish / valid email wrong password
  await page.goto('https://rahulshettyacademy.com/client/#/auth/login', { waitUntil: 'networkidle' });
  await page.locator('#userEmail').fill(username);
  await page.locator('#userPassword').fill('WrongPass!999');
  await page.locator('#login').click();
  await toast.first().waitFor({ state: 'visible', timeout: 8000 });
  findings.auth.invalidPasswordOnly = {
    toast: (await toast.first().innerText()).trim(),
    url: page.url(),
  };
  await shot(page, '06-login-invalid-password');

  // valid login
  await login(page, username, password);
  await page.waitForURL(/dashboard/, { timeout: 20000 });
  findings.auth.validLogin = { url: page.url() };
  await shot(page, '07-products-after-login');

  // ---------- PRODUCTS ----------
  const productNames = await page.locator('.card-body').filter({ visible: true }).locator('b').allTextContents();
  findings.products.visibleNames = productNames.map((n) => n.trim());
  findings.products.cardCount = await page.locator('.card-body').filter({ visible: true }).count();
  await shot(page, '08-products-list');

  // clear cart first
  await page.goto('https://rahulshettyacademy.com/client/#/dashboard/cart');
  await page.waitForTimeout(1500);
  while ((await page.locator('button.btn-danger').count()) > 0) {
    await page.locator('button.btn-danger').first().click();
    await page.waitForTimeout(700);
  }
  findings.cart.emptyAfterClear = {
    messageVisible: await page.getByText('No Products in Your Cart !').isVisible().catch(() => false),
    messageText: 'No Products in Your Cart !',
    bodySnippet: (await page.locator('body').innerText()).includes('No Products in Your Cart !'),
  };
  await shot(page, '09-cart-empty');

  // Attempt checkout with empty cart (if button exists)
  const emptyCheckout = page.getByRole('button', { name: /checkout/i });
  findings.cart.emptyCheckoutButtonVisible = await emptyCheckout.isVisible().catch(() => false);

  // Add multiple products
  await page.goto('https://rahulshettyacademy.com/client/#/dashboard/dash');
  await page.locator('.card-body').filter({ visible: true }).first().waitFor({ state: 'visible' });
  const names = findings.products.visibleNames;
  for (const name of names.slice(0, 3)) {
    const card = page.locator('.card-body').filter({ visible: true }).filter({ has: page.locator('b', { hasText: name }) });
    await card.getByRole('button', { name: /add to cart/i }).click();
    await page.locator('#toast-container .toast-message').filter({ hasText: /product added to cart/i }).first().waitFor({ state: 'visible' });
    await page.waitForTimeout(400);
  }
  findings.products.addToCartToast = 'Product Added To Cart';
  await shot(page, '10-products-after-multi-add');

  // ---------- CART ----------
  await page.goto('https://rahulshettyacademy.com/client/#/dashboard/cart');
  await page.locator('li.items').first().waitFor({ state: 'visible' });
  const cartNames = (await page.locator('li.items h3').allTextContents()).map((n) => n.trim());
  findings.cart.productsAfterAdd = cartNames;
  await shot(page, '11-cart-multi-items');

  // Remove middle/first dynamically
  const removeTarget = cartNames[Math.floor(cartNames.length / 2)] || cartNames[0];
  const row = page.locator('li.items').filter({ has: page.locator('h3', { hasText: removeTarget }) });
  await row.locator('button.btn-danger').click();
  await page.waitForTimeout(1000);
  const afterRemove = (await page.locator('li.items h3').allTextContents()).map((n) => n.trim());
  findings.cart.removeOne = {
    removed: removeTarget,
    remaining: afterRemove,
    removedGone: !afterRemove.includes(removeTarget),
  };
  await shot(page, '12-cart-after-remove-one');

  // Remove nonexistent — just observe remaining
  findings.cart.nonexistentBehavior = {
    note: 'UI has no explicit error for removing a nonexistent product; automation should detect absence and avoid clicking.',
  };

  // ---------- CHECKOUT ----------
  // Ensure at least one item
  if ((await page.locator('li.items').count()) === 0) {
    await page.goto('https://rahulshettyacademy.com/client/#/dashboard/dash');
    await page.locator('.card-body').filter({ visible: true }).first().waitFor({ state: 'visible' });
    const card = page.locator('.card-body').filter({ visible: true }).first();
    await card.getByRole('button', { name: /add to cart/i }).click();
    await page.locator('#toast-container .toast-message').filter({ hasText: /product added to cart/i }).first().waitFor({ state: 'visible' });
    await page.goto('https://rahulshettyacademy.com/client/#/dashboard/cart');
    await page.locator('li.items').first().waitFor({ state: 'visible' });
  }

  await page.getByRole('button', { name: /checkout/i }).click();
  await page.waitForURL(/dashboard\/order/);
  await page.getByText('Payment Method').waitFor({ state: 'visible' });
  await shot(page, '13-checkout-page');

  // Inspect expiry selects structure
  const expiryField = page.locator('.field', { hasText: 'Expiry Date' });
  const expirySelects = expiryField.locator('select.input.ddl');
  findings.checkout.expirySelectCount = await expirySelects.count();
  findings.checkout.monthOptions = await expirySelects.nth(0).locator('option').allTextContents();
  findings.checkout.yearOptionsSample = (await expirySelects.nth(1).locator('option').allTextContents()).slice(0, 5);

  // Country typeahead
  const country = page.getByPlaceholder('Select Country');
  await country.click();
  await country.fill('');
  await country.pressSequentially('ind', { delay: 80 });
  const suggestions = page.locator('section.ta-results button, .ta-results button');
  await suggestions.first().waitFor({ state: 'visible', timeout: 10000 });
  const suggestionTexts = (await suggestions.allTextContents()).map((t) => t.trim());
  findings.checkout.countrySuggestionsForInd = suggestionTexts;
  await shot(page, '14-checkout-country-suggestions');
  const india = suggestions.filter({ hasText: /india/i }).first();
  await india.click();
  findings.checkout.selectedCountryValue = await country.inputValue();
  await shot(page, '15-checkout-country-selected');

  // Missing country / place order without country (reload flow)
  // Fill CVV + name, clear country if possible, try place order
  await page.locator('.field', { hasText: 'CVV Code' }).locator('input').fill('123');
  await page.locator('.field', { hasText: 'Name on Card' }).locator('input').fill('Auto Tester');
  // Clear country
  await country.fill('');
  await page.locator('a.action__submit').click();
  await page.waitForTimeout(1500);
  findings.checkout.placeOrderWithoutCountry = {
    url: page.url(),
    toast: await page.locator('#toast-container .toast-message').first().innerText().catch(() => null),
    stillOnCheckout: /dashboard\/order/.test(page.url()),
  };
  await shot(page, '16-checkout-missing-country');

  // Valid checkout + place order
  await country.click();
  await country.fill('');
  await country.pressSequentially('ind', { delay: 80 });
  await suggestions.filter({ hasText: /^\s*India\s*$/i }).first().waitFor({ state: 'visible' });
  await suggestions.filter({ hasText: /^\s*India\s*$/i }).first().click();
  await page.locator('.field', { hasText: 'CVV Code' }).locator('input').fill('123');
  await page.locator('.field', { hasText: 'Name on Card' }).locator('input').fill('Auto Tester');
  // select expiry via Expiry Date field
  await expirySelects.nth(0).selectOption({ label: '05' });
  await expirySelects.nth(1).selectOption({ label: '25' });
  await shot(page, '17-checkout-filled-valid');
  await page.locator('a.action__submit').click();

  // Confirmation
  await page.waitForTimeout(2500);
  findings.confirmation.url = page.url();
  findings.confirmation.bodyText = (await page.locator('body').innerText()).slice(0, 1200);
  const thanks = page.getByText(/thank/i);
  findings.confirmation.thankYouVisible = await thanks.first().isVisible().catch(() => false);
  findings.confirmation.thankYouText = (await thanks.first().textContent().catch(() => null) || '').trim();
  const orderIdLabel = page.locator('label', { hasText: /order/i });
  findings.confirmation.orderLabels = (await page.locator('label, h1, h2, h3').allTextContents()).map((t) => t.trim()).filter(Boolean).slice(0, 30);
  await shot(page, '18-order-confirmation');

  // Try more confirmation details
  const confHtml = await page.content();
  fs.writeFileSync(path.join(OUT, '18-order-confirmation.html'), confHtml);
  const confMatch = confHtml.match(/Thank you[\s\S]{0,200}/i);
  findings.confirmation.htmlSnippet = confMatch ? confMatch[0].replace(/\s+/g, ' ') : null;

  fs.writeFileSync(path.join(OUT, 'phase3-findings.json'), JSON.stringify(findings, null, 2));
  console.log(JSON.stringify(findings, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
