import { Locator, Page } from '@playwright/test';
import { routes } from '../utils/routes';

/**
 * Shared page behaviors (header navigation / toasts) for authenticated pages.
 * Assertions stay in tests; this class exposes interactions and element accessors only.
 */
export abstract class BasePage {
  readonly page: Page;
  readonly homeLink: Locator;
  readonly ordersLink: Locator;
  readonly cartLink: Locator;
  readonly signOutButton: Locator;
  readonly toastContainer: Locator;
  readonly toastMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.homeLink = page.locator('button[routerlink="/dashboard/"]');
    this.ordersLink = page.locator('button[routerlink="/dashboard/myorders"]');
    this.cartLink = page.locator('button[routerlink="/dashboard/cart"]');
    this.signOutButton = page.getByRole('button', { name: /sign out/i });
    this.toastContainer = page.locator('#toast-container');
    this.toastMessage = page.locator('#toast-container .toast-message');
  }

  /**
   * Prefer direct hash-route navigation for reliability.
   * Header clicks can be intercepted by overlapping checkout content.
   */
  async gotoHome(): Promise<void> {
    await this.page.goto(routes.products);
    await this.page.waitForURL(/dashboard\/?($|dash)/);
  }

  /**
   * Navigate to cart URL only. CartPage.goto() adds cart-content settling.
   */
  async gotoCart(): Promise<void> {
    await this.page.goto(routes.cart);
    await this.page.waitForURL(/dashboard\/cart/);
  }

  async gotoOrders(): Promise<void> {
    await this.page.goto(routes.orders);
    await this.page.waitForURL(/dashboard\/myorders/);
  }

  async clickCartNav(): Promise<void> {
    await this.cartLink.click();
    await this.page.waitForURL(/dashboard\/cart/);
  }

  async signOut(): Promise<void> {
    await this.signOutButton.click();
  }

  async getToastText(): Promise<string> {
    await this.toastMessage.first().waitFor({ state: 'visible' });
    return (await this.toastMessage.first().innerText()).trim();
  }

  async getCartBadgeCount(): Promise<number> {
    const text = (await this.cartLink.innerText()).trim();
    const match = text.match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }
}
