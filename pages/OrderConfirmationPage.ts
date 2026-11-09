import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Order confirmation ("thanks") page shown after successful Place Order.
 * Observed URL pattern: /client/#/dashboard/thanks?prop=...
 */
export class OrderConfirmationPage extends BasePage {
  readonly root: Locator;
  readonly thankYouMessage: Locator;
  readonly orderHistoryLink: Locator;
  readonly orderIdLabel: Locator;
  readonly downloadCsvLink: Locator;

  /** Confirmed live copy (spacing/casing as rendered). */
  static readonly THANK_YOU_TEXT = 'THANKYOU FOR THE ORDER.';

  constructor(page: Page) {
    super(page);
    this.root = page.locator('app-thanksorder');
    this.thankYouMessage = this.root.getByText(/thankyou for the order/i);
    this.orderHistoryLink = this.root.getByRole('link', { name: /orders history page/i });
    this.orderIdLabel = this.root.locator('label').filter({ hasText: /\|/ });
    this.downloadCsvLink = this.root.getByText(/click to download order details in csv/i);
  }

  async waitForPage(): Promise<void> {
    await this.page.waitForURL(/dashboard\/thanks/);
    await this.thankYouMessage.waitFor({ state: 'visible' });
  }

  async getThankYouText(): Promise<string> {
    return (await this.thankYouMessage.innerText()).trim();
  }

  async getOrderIdText(): Promise<string> {
    return (await this.orderIdLabel.first().innerText()).trim();
  }

  async isDisplayed(): Promise<boolean> {
    return this.thankYouMessage.isVisible();
  }
}
