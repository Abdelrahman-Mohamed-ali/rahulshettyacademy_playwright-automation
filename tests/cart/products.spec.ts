import { test, expect } from '../../fixtures/test';
import { ProductsPage, CartPage } from '../../pages';
import { loginAndClearCart, clearCart } from '../../utils/session';
import { getKnownProductNames, getMessages } from '../../utils/test-data';

const messages = getMessages();
const knownProducts = getKnownProductNames();

test.describe('Products business scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndClearCart(page);
  });

  test('PRD-01 @smoke @sanity @positive - View available products after login', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    await productsPage.goto();

    const visibleNames = await productsPage.getVisibleProductNames();
    expect(visibleNames.length).toBeGreaterThan(0);

    for (const productName of knownProducts) {
      expect(visibleNames.some((name) => name.toLowerCase() === productName.toLowerCase())).toBeTruthy();
    }
  });

  test('PRD-02 @smoke @regression @positive - Add a single product to cart', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);
    const productName = 'ZARA COAT 3';

    await productsPage.goto();
    const badgeBefore = await productsPage.getCartBadgeCount();
    // Page object waits for the live toast "Product Added To Cart" before returning.
    await productsPage.addProductToCart(productName);

    expect(await productsPage.getCartBadgeCount()).toBe(badgeBefore + 1);
    expect(messages.products.addedToCartToast).toBe(ProductsPage.ADDED_TO_CART_TOAST);

    await cartPage.goto();
    expect(await cartPage.isProductInCart(productName)).toBeTruthy();
  });

  test('PRD-03 @regression @positive - Add multiple products to cart', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);
    const selected = knownProducts.slice(0, 3);

    await productsPage.goto();
    await productsPage.addProductsToCart(selected);

    expect(await productsPage.getCartBadgeCount()).toBe(selected.length);

    await cartPage.goto();
    const cartNames = await cartPage.getCartProductNames();
    for (const productName of selected) {
      expect(cartNames.some((name) => name.toLowerCase() === productName.toLowerCase())).toBeTruthy();
    }
    expect(await cartPage.getCartItemCount()).toBe(selected.length);
  });

  test('PRD-04 @regression @positive - Product selection by dynamic name', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const targetName = 'ADIDAS ORIGINAL';

    await productsPage.goto();
    const card = productsPage.productCardByName(targetName);

    await expect(card).toHaveCount(1);
    await expect(card).toBeVisible();
    await expect(card.locator('b')).toHaveText(new RegExp(targetName, 'i'));
    await expect(card.getByRole('button', { name: /add to cart/i })).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Best-effort cleanup for shared practice account.
    try {
      await clearCart(page);
    } catch {
      // Ignore cleanup failures so they do not mask primary assertions.
    }
  });
});
