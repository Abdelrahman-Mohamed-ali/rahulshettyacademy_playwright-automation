import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { routes } from '../utils/routes';
import { escapeRegExp } from '../utils/strings';

/**
 * Discriminated result for dynamic cart removal.
 * Tests assert on `status` — page object does not throw for expected negative paths.
 */
export type RemoveItemResult =
  | { status: 'removed'; productName: string }
  | { status: 'not-found'; productName: string }
  | { status: 'empty-cart'; productName: string }
  | { status: 'removal-failed'; productName: string; detail: string };

/**
 * Shopping cart page with dynamic, product-scoped remove behavior.
 */
export class CartPage extends BasePage {
  readonly cartHeading: Locator;
  readonly cartItems: Locator;
  readonly checkoutButton: Locator;
  readonly continueShoppingButton: Locator;
  readonly emptyCartMessage: Locator;

  /** Known empty-cart copy validated against the live application. */
  static readonly EMPTY_CART_TEXT = 'No Products in Your Cart !';

  constructor(page: Page) {
    super(page);
    this.cartHeading = page.getByRole('heading', { name: /my cart/i });
    this.cartItems = page.locator('li.items');
    // Accessible name includes a trailing ❯ glyph in the live UI.
    this.checkoutButton = page.getByRole('button', { name: /checkout/i });
    this.continueShoppingButton = page.getByRole('button', { name: /continue shopping/i });
    this.emptyCartMessage = page.getByText(CartPage.EMPTY_CART_TEXT);
  }

  async goto(): Promise<void> {
    await this.page.goto(routes.cart);
    await this.page.waitForURL(/dashboard\/cart/);
    await this.waitForCartToSettle();
  }

  /**
   * Cart contents hydrate asynchronously after navigation.
   */
  async waitForCartToSettle(): Promise<void> {
    await Promise.race([
      this.cartItems.first().waitFor({ state: 'visible', timeout: 15_000 }),
      this.emptyCartMessage.waitFor({ state: 'visible', timeout: 15_000 }),
    ]);
  }

  cartItemByName(productName: string): Locator {
    return this.cartItems.filter({
      has: this.page.locator('h3', { hasText: new RegExp(`^${escapeRegExp(productName)}$`, 'i') }),
    });
  }

  /** Remove control scoped to a single cart row (trash icon button). */
  removeButtonForProduct(productName: string): Locator {
    return this.cartItemByName(productName).locator('button.btn-danger');
  }

  async getCartProductNames(): Promise<string[]> {
    const names = await this.cartItems.locator('h3').allTextContents();
    return names.map((name) => name.trim()).filter(Boolean);
  }

  async getCartItemCount(): Promise<number> {
    return this.cartItems.count();
  }

  async isProductInCart(productName: string): Promise<boolean> {
    return (await this.cartItemByName(productName).count()) > 0;
  }

  async getProductPriceText(productName: string): Promise<string> {
    const item = this.cartItemByName(productName);
    return (await item.locator('.prodTotal').innerText()).trim();
  }

  /**
   * Dynamically removes a single product by name/identifier.
   * - No hardcoded indexes or fixed product lists
   * - Remove button is scoped to the matching product container
   * - Expected negatives return `empty-cart` / `not-found`
   * - Unexpected UI failure returns `removal-failed` (not swallowed)
   */
  async removeItem(productName: string): Promise<RemoveItemResult> {
    await this.waitForCartToSettle();

    const itemCount = await this.getCartItemCount();
    if (itemCount === 0) {
      return { status: 'empty-cart', productName };
    }

    const item = this.cartItemByName(productName);
    const matches = await item.count();
    if (matches === 0) {
      return { status: 'not-found', productName };
    }
    if (matches > 1) {
      return {
        status: 'removal-failed',
        productName,
        detail: `Expected a single cart row for "${productName}" but found ${matches}`,
      };
    }

    const removeButton = this.removeButtonForProduct(productName);
    if ((await removeButton.count()) === 0) {
      return {
        status: 'removal-failed',
        productName,
        detail: `Remove button not found for product "${productName}"`,
      };
    }

    await removeButton.click();

    try {
      await item.waitFor({ state: 'detached', timeout: 10_000 });
    } catch {
      // Fall through to explicit presence check below.
    }

    if (await this.isProductInCart(productName)) {
      return {
        status: 'removal-failed',
        productName,
        detail: `Product "${productName}" remained in the cart after clicking Remove`,
      };
    }

    // Keep header badge in sync with remaining line items when the UI updates it.
    await this.waitForCartBadgeToMatchItemCount();

    return { status: 'removed', productName };
  }

  /**
   * Waits until the header cart badge digits match the current line-item count.
   * When the cart is empty the badge typically has no numeric label (count = 0).
   * Best-effort only — badge lag does not change the removal result status.
   */
  async waitForCartBadgeToMatchItemCount(timeoutMs = 10_000): Promise<void> {
    const expected = await this.getCartItemCount();

    try {
      if (expected > 0) {
        await this.cartLink
          .filter({ hasText: new RegExp(`\\b${expected}\\b`) })
          .waitFor({ state: 'visible', timeout: timeoutMs });
        return;
      }

      await this.page.waitForFunction(
        () => {
          const el = document.querySelector('button[routerlink="/dashboard/cart"]');
          const match = (el?.textContent || '').match(/(\d+)/);
          return !match || Number(match[1]) === 0;
        },
        undefined,
        { timeout: timeoutMs }
      );
    } catch {
      // Badge sync is best-effort; product removal already succeeded.
    }
  }

  /**
   * Removes every cart line by repeatedly resolving the current first product name.
   * Returns each step result for diagnostics; stops early on non-removed outcomes.
   */
  async removeAllItems(): Promise<RemoveItemResult[]> {
    const results: RemoveItemResult[] = [];
    let safety = 20;

    while ((await this.getCartItemCount()) > 0 && safety > 0) {
      const firstName = (await this.cartItems.first().locator('h3').innerText()).trim();
      const result = await this.removeItem(firstName);
      results.push(result);

      if (result.status !== 'removed') {
        break;
      }
      safety -= 1;
    }

    if ((await this.getCartItemCount()) > 0 && safety === 0) {
      results.push({
        status: 'removal-failed',
        productName: '(cart)',
        detail: 'Safety limit reached while emptying cart; items still remain',
      });
    }

    return results;
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
    await this.page.waitForURL(/dashboard\/order/);
  }

  async continueShopping(): Promise<void> {
    await this.continueShoppingButton.click();
    await this.page.waitForURL(/dashboard/);
  }

  async isEmpty(): Promise<boolean> {
    return (await this.getCartItemCount()) === 0;
  }

  async isDisplayed(): Promise<boolean> {
    return this.cartHeading.isVisible();
  }
}
