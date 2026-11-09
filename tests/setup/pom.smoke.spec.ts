import { test, expect } from '../../fixtures/test';
import { LoginPage, ProductsPage, CartPage, CheckoutPage } from '../../pages';
import { getCredentials } from '../../utils/env';

/**
 * Structural POM / locator smoke checks — not full business scenario coverage.
 *
 * Tagging convention (applied in titles for --grep compatibility):
 * - Login locator check: @smoke @sanity @positive
 * - Authenticated locator flow: @smoke @regression @positive
 */
test.describe('POM locator smoke', () => {
  test('LoginPage locators are visible on the auth screen @smoke @sanity @positive', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('Authenticated page objects resolve key locators @smoke @regression @positive', async ({
    page,
  }) => {
    const credentials = getCredentials();
    const loginPage = new LoginPage(page);
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    await loginPage.goto();
    await loginPage.login(credentials.username, credentials.password);
    await expect(page).toHaveURL(/dashboard/);

    await productsPage.waitForProductsToLoad();
    const productNames = await productsPage.getVisibleProductNames();
    expect(productNames.length).toBeGreaterThan(0);

    const productName = productNames.find((name) => /zara coat 3/i.test(name)) ?? productNames[0];
    await productsPage.addProductToCart(productName);

    // Independent cart-badge locator check (label inside the cart nav button).
    await expect(productsPage.cartBadge).toBeVisible();
    expect(await productsPage.getCartBadgeCount()).toBeGreaterThan(0);

    await cartPage.goto();

    await expect(cartPage.cartHeading).toBeVisible();
    await expect.poll(async () => cartPage.isProductInCart(productName)).toBeTruthy();
    await expect(cartPage.checkoutButton).toBeVisible();

    await cartPage.proceedToCheckout();
    await checkoutPage.waitForPage();
    await expect(checkoutPage.paymentTitle).toBeVisible();
    await expect(checkoutPage.creditCardNumberInput).toBeVisible();
    await expect(checkoutPage.cvvInput).toBeVisible();
    await expect(checkoutPage.nameOnCardInput).toBeVisible();
    await expect(checkoutPage.countryInput).toBeVisible();
    await expect(checkoutPage.placeOrderButton).toBeVisible();

    await cartPage.goto();
    const removeResult = await cartPage.removeItem(productName);
    expect(removeResult.status).toBe('removed');
  });
});
