import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface CheckoutPaymentDetails {
  cardNumber?: string;
  cvv?: string;
  nameOnCard?: string;
  expiryMonth?: string;
  expiryYear?: string;
  country: string;
  coupon?: string;
}

/**
 * Checkout / order payment page.
 * Field locators validated against the live payment form.
 */
export class CheckoutPage extends BasePage {
  readonly paymentTitle: Locator;
  readonly creditCardNumberInput: Locator;
  readonly expiryDateField: Locator;
  readonly expiryMonthSelect: Locator;
  readonly expiryYearSelect: Locator;
  readonly cvvInput: Locator;
  readonly nameOnCardInput: Locator;
  readonly couponInput: Locator;
  readonly applyCouponButton: Locator;
  readonly countryInput: Locator;
  readonly countrySuggestions: Locator;
  readonly placeOrderButton: Locator;
  readonly orderSummaryItems: Locator;

  constructor(page: Page) {
    super(page);
    this.paymentTitle = page.getByText('Payment Method');
    this.creditCardNumberInput = page.locator('.field', { hasText: 'Credit Card Number' }).locator('input');
    this.expiryDateField = page.locator('.field', { hasText: 'Expiry Date' });
    // Scoped to the Expiry Date field — avoids positional page-level select indexes.
    this.expiryMonthSelect = this.expiryDateField.locator('select').nth(0);
    this.expiryYearSelect = this.expiryDateField.locator('select').nth(1);
    this.cvvInput = page.locator('.field', { hasText: 'CVV Code' }).locator('input');
    this.nameOnCardInput = page.locator('.field', { hasText: 'Name on Card' }).locator('input');
    this.couponInput = page.locator('input[name="coupon"]');
    this.applyCouponButton = page.getByRole('button', { name: /apply coupon/i });
    this.countryInput = page.getByPlaceholder('Select Country');
    this.countrySuggestions = page.locator('.ta-results button');
    this.placeOrderButton = page.locator('a.action__submit');
    this.orderSummaryItems = page.locator('.item__title');
  }

  async waitForPage(): Promise<void> {
    await this.page.waitForURL(/dashboard\/order/);
    await this.paymentTitle.waitFor({ state: 'visible' });
  }

  async fillCreditCardNumber(cardNumber: string): Promise<void> {
    await this.creditCardNumberInput.fill(cardNumber);
  }

  async fillCvv(cvv: string): Promise<void> {
    await this.cvvInput.fill(cvv);
  }

  async fillNameOnCard(name: string): Promise<void> {
    await this.nameOnCardInput.fill(name);
  }

  async selectExpiry(month: string, year: string): Promise<void> {
    await this.expiryMonthSelect.selectOption({ label: month });
    await this.expiryYearSelect.selectOption({ label: year });
  }

  /**
   * Types a country fragment and selects a matching typeahead suggestion.
   * Example suggestions for "ind": British Indian Ocean Territory, India, Indonesia.
   */
  async selectCountry(country: string): Promise<void> {
    await this.countryInput.click();
    await this.countryInput.fill('');
    await this.countryInput.pressSequentially(country, { delay: 50 });
    const suggestion = this.countrySuggestions
      .filter({ hasText: new RegExp(`^\\s*${country}\\s*$`, 'i') })
      .first();
    await suggestion.waitFor({ state: 'visible' });
    await suggestion.click();
  }

  async applyCoupon(coupon: string): Promise<void> {
    await this.couponInput.fill(coupon);
    await this.applyCouponButton.click();
  }

  async fillCheckoutDetails(details: CheckoutPaymentDetails): Promise<void> {
    if (details.cardNumber) {
      await this.fillCreditCardNumber(details.cardNumber);
    }
    if (details.cvv) {
      await this.fillCvv(details.cvv);
    }
    if (details.nameOnCard) {
      await this.fillNameOnCard(details.nameOnCard);
    }
    if (details.expiryMonth && details.expiryYear) {
      await this.selectExpiry(details.expiryMonth, details.expiryYear);
    }
    if (details.coupon) {
      await this.applyCoupon(details.coupon);
    }
    await this.selectCountry(details.country);
  }

  async placeOrder(): Promise<void> {
    await this.placeOrderButton.click();
  }

  async getOrderSummaryText(): Promise<string> {
    return (await this.page.locator('.payment').first().innerText()).trim();
  }

  async isDisplayed(): Promise<boolean> {
    return this.paymentTitle.isVisible();
  }
}
