import { test, expect } from '../../fixtures/test';
import { CartPage } from '../../pages';
import { loginAndClearCart, addProductsToEmptyCart, clearCart } from '../../utils/session';
import { getKnownProductNames } from '../../utils/test-data';

const catalog = getKnownProductNames();

test.describe('Dynamic RemoveItem scenarios (CART-02..CART-06)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndClearCart(page);
  });

  test('CART-02 @smoke @regression @positive - Remove one product from a multi-item cart', async ({
    page,
  }) => {
    const seeded = catalog.slice(0, 3);
    expect(seeded.length).toBeGreaterThanOrEqual(2);

    await addProductsToEmptyCart(page, seeded);
    const cartPage = new CartPage(page);
    await cartPage.goto();

    const beforeNames = await cartPage.getCartProductNames();
    expect(beforeNames.length).toBe(seeded.length);

    const target = beforeNames[1] ?? beforeNames[0];
    const expectedRemaining = beforeNames.filter(
      (name) => name.toLowerCase() !== target.toLowerCase()
    );

    const result = await cartPage.removeItem(target);

    expect(result.status).toBe('removed');
    expect(await cartPage.isProductInCart(target)).toBeFalsy();

    const afterNames = await cartPage.getCartProductNames();
    expect(afterNames).toEqual(expectedRemaining);
    // Cart line items are the reliable source of truth after navigation; the
    // header badge <label> hydrates later and must not drive this assertion.
    expect(afterNames.length).toBe(beforeNames.length - 1);
  });

  for (const position of ['first', 'middle', 'last'] as const) {
    test(`CART-03 @regression @positive - Remove ${position} product by dynamic name`, async ({
      page,
    }) => {
      const seeded = catalog.slice(0, 3);
      expect(seeded.length).toBe(3);

      await addProductsToEmptyCart(page, seeded);
      const cartPage = new CartPage(page);
      await cartPage.goto();

      const beforeNames = await cartPage.getCartProductNames();
      expect(beforeNames.length).toBe(3);

      const index =
        position === 'first' ? 0 : position === 'middle' ? 1 : beforeNames.length - 1;
      const target = beforeNames[index];
      const expectedRemaining = beforeNames.filter((_, i) => i !== index);

      const result = await cartPage.removeItem(target);

      expect(result).toEqual({ status: 'removed', productName: target });
      expect(await cartPage.isProductInCart(target)).toBeFalsy();
      expect(await cartPage.getCartProductNames()).toEqual(expectedRemaining);
      expect(await cartPage.getCartItemCount()).toBe(2);
    });
  }

  test('CART-04 @regression @positive - Remove all products via repeated dynamic RemoveItem', async ({
    page,
  }) => {
    const seeded = catalog.slice(0, 3);
    await addProductsToEmptyCart(page, seeded);

    const cartPage = new CartPage(page);
    await cartPage.goto();
    expect(await cartPage.getCartItemCount()).toBe(seeded.length);

    const results = await cartPage.removeAllItems();

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((result) => result.status === 'removed')).toBeTruthy();
    expect(await cartPage.getCartItemCount()).toBe(0);
    await expect(cartPage.emptyCartMessage).toBeVisible();
    await expect(cartPage.emptyCartMessage).toHaveText(CartPage.EMPTY_CART_TEXT);

    // Badge can lag briefly after the last item is removed; re-open cart and poll.
    await cartPage.goto();
    await expect(cartPage.emptyCartMessage).toBeVisible();
    await expect
      .poll(async () => cartPage.getCartBadgeCount(), { timeout: 10_000 })
      .toBe(0);
  });

  test('CART-05 @regression @negative - Removing a nonexistent product leaves cart unchanged', async ({
    page,
  }) => {
    const seeded = catalog.slice(0, 2);
    await addProductsToEmptyCart(page, seeded);

    const cartPage = new CartPage(page);
    await cartPage.goto();

    const beforeNames = await cartPage.getCartProductNames();
    expect(beforeNames.length).toBe(seeded.length);
    // Badge label lags cart-item hydration after navigation — sync before comparing.
    await expect
      .poll(async () => cartPage.getCartBadgeCount(), { timeout: 10_000 })
      .toBe(beforeNames.length);
    const badgeBefore = await cartPage.getCartBadgeCount();
    const missingName = 'NOT_A_REAL_PRODUCT';

    const result = await cartPage.removeItem(missingName);

    expect(result).toEqual({ status: 'not-found', productName: missingName });
    expect(await cartPage.getCartProductNames()).toEqual(beforeNames);
    expect(await cartPage.getCartItemCount()).toBe(beforeNames.length);
    expect(await cartPage.getCartBadgeCount()).toBe(badgeBefore);
    for (const name of beforeNames) {
      expect(await cartPage.isProductInCart(name)).toBeTruthy();
    }
  });

  test('CART-06 @regression @negative - Removing from an empty cart returns empty-cart', async ({
    page,
  }) => {
    const cartPage = new CartPage(page);
    await cartPage.goto();

    await expect(cartPage.emptyCartMessage).toBeVisible();
    expect(await cartPage.getCartItemCount()).toBe(0);

    const result = await cartPage.removeItem('ZARA COAT 3');

    expect(result).toEqual({ status: 'empty-cart', productName: 'ZARA COAT 3' });
    await expect(cartPage.emptyCartMessage).toBeVisible();
    await expect(cartPage.emptyCartMessage).toHaveText(CartPage.EMPTY_CART_TEXT);
    expect(await cartPage.getCartItemCount()).toBe(0);
  });

  test.afterEach(async ({ page }) => {
    try {
      await clearCart(page);
    } catch {
      // Ignore cleanup failures.
    }
  });
});
