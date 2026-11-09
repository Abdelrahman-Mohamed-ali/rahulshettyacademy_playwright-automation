import { test, expect } from '../../fixtures/test';
import { ProductsPage, CartPage } from '../../pages';
import { loginAndClearCart, addProductsToEmptyCart, clearCart } from '../../utils/session';

/**
 * Cart contents, empty state, navigation, and totals.
 * Dynamic RemoveItem edge cases: see remove-item.spec.ts (CART-02..CART-06).
 */
test.describe('Cart business scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndClearCart(page);
  });

  test('CART-01 @smoke @regression @positive - Open cart and verify selected products', async ({
    page,
  }) => {
    const productName = 'ZARA COAT 3';
    await addProductsToEmptyCart(page, [productName]);

    const cartPage = new CartPage(page);
    await cartPage.goto();

    await expect(cartPage.cartHeading).toBeVisible();
    expect(await cartPage.isProductInCart(productName)).toBeTruthy();
    await expect(cartPage.cartItemByName(productName).locator('h3')).toBeVisible();
    await expect(cartPage.cartItemByName(productName).locator('.prodTotal')).toBeVisible();
    await expect(cartPage.checkoutButton).toBeVisible();
  });

  test('CART-07 @regression @positive - Verify cart line price and totals for selected items', async ({
    page,
  }) => {
    const productName = 'ADIDAS ORIGINAL';
    await addProductsToEmptyCart(page, [productName]);

    const cartPage = new CartPage(page);
    await cartPage.goto();

    const linePrice = await cartPage.getProductPriceText(productName);
    expect(linePrice.length).toBeGreaterThan(0);
    expect(linePrice).toMatch(/\$\s*\d+/);

    await expect(page.getByText(/SUBTOTAL/i).first()).toBeVisible();
    await expect(page.getByText(/TOTAL/i).first()).toBeVisible();
  });

  test('CART-EMPTY @smoke @regression @positive - Empty cart shows known empty message', async ({
    page,
  }) => {
    const cartPage = new CartPage(page);
    await cartPage.goto();

    await expect(cartPage.emptyCartMessage).toBeVisible();
    await expect(cartPage.emptyCartMessage).toHaveText(CartPage.EMPTY_CART_TEXT);
    expect(await cartPage.getCartItemCount()).toBe(0);
    await expect(cartPage.checkoutButton).toHaveCount(0);
  });

  test('CART-NAV @regression @positive - Continue Shopping returns to products dashboard', async ({
    page,
  }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);

    await cartPage.goto();
    await cartPage.continueShopping();

    await expect(page).toHaveURL(/dashboard/);
    await productsPage.waitForProductsToLoad();
    await expect(productsPage.productCards.first()).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    try {
      await clearCart(page);
    } catch {
      // Ignore cleanup failures.
    }
  });
});
