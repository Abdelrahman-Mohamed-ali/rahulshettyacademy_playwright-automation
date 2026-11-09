import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { routes } from '../utils/routes';
import { escapeRegExp } from '../utils/strings';

/**
 * Products / dashboard page shown after successful authentication.
 */
export class ProductsPage extends BasePage {
  readonly productCards: Locator;
  readonly searchInput: Locator;
  readonly filtersHeading: Locator;

  static readonly ADDED_TO_CART_TOAST = 'Product Added To Cart';

  constructor(page: Page) {
    super(page);
    // The app renders duplicate responsive grids; only interact with visible cards.
    this.productCards = page.locator('.card-body').filter({ visible: true });
    this.searchInput = page.locator('input[formcontrolname="productName"]').filter({ visible: true }).first();
    this.filtersHeading = page.getByRole('heading', { name: /filters/i }).first();
  }

  async goto(): Promise<void> {
    await this.page.goto(routes.products);
    await this.waitForProductsToLoad();
  }

  async waitForProductsToLoad(): Promise<void> {
    await this.productCards.first().waitFor({ state: 'visible' });
  }

  productCardByName(productName: string): Locator {
    return this.productCards.filter({
      has: this.page.locator('b', { hasText: new RegExp(`^${escapeRegExp(productName)}$`, 'i') }),
    });
  }

  async getVisibleProductNames(): Promise<string[]> {
    const names = await this.productCards.locator('b').allTextContents();
    return names.map((name) => name.trim()).filter(Boolean);
  }

  async addProductToCart(productName: string): Promise<void> {
    const card = this.productCardByName(productName);
    const previousCount = await this.getCartBadgeCount();
    await card.getByRole('button', { name: /add to cart/i }).click();

    await this.toastMessage
      .filter({ hasText: /product added to cart/i })
      .first()
      .waitFor({ state: 'visible' });

    // Wait on the dedicated badge <label>, not the whole cart button text.
    const expectedCount = previousCount + 1;
    await this.cartBadge
      .filter({ hasText: new RegExp(`^\\s*${expectedCount}\\s*$`) })
      .waitFor({ state: 'visible' });
  }

  async addProductsToCart(productNames: string[]): Promise<void> {
    for (const productName of productNames) {
      await this.addProductToCart(productName);
    }
  }

  async viewProduct(productName: string): Promise<void> {
    const card = this.productCardByName(productName);
    await card.getByRole('button', { name: /^view$/i }).click();
  }

  async searchProduct(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }

  async isDisplayed(): Promise<boolean> {
    return this.productCards.first().isVisible();
  }
}
