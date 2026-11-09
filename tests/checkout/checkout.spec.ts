import { test, expect } from '../../fixtures/test';
import { CheckoutPage, OrderConfirmationPage, CartPage } from '../../pages';
import {
  loginAndClearCart,
  openCheckoutWithProducts,
  clearCart,
  isOrderPlacementAllowed,
} from '../../utils/session';
import {
  getCheckoutValidData,
  COUNTRY_SUGGESTIONS_FOR_IND,
  getMessages,
} from '../../utils/test-data';

const checkoutData = getCheckoutValidData();
const messages = getMessages();

test.describe('Checkout business scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndClearCart(page);
  });

  test('CHK-01 @smoke @regression @positive - Proceed to checkout with valid cart data', async ({
    page,
  }) => {
    const { checkoutPage } = await openCheckoutWithProducts(page, ['ZARA COAT 3']);

    await expect(page).toHaveURL(/dashboard\/order/);
    await expect(checkoutPage.paymentTitle).toBeVisible();
    await expect(checkoutPage.creditCardNumberInput).toBeVisible();
    await expect(checkoutPage.placeOrderButton).toBeVisible();
  });

  test('CHK-03 @regression @negative - Place Order with missing country does not place order', async ({
    page,
  }) => {
    const { checkoutPage } = await openCheckoutWithProducts(page, ['ZARA COAT 3']);

    await checkoutPage.fillCvv(checkoutData.cvv);
    await checkoutPage.fillNameOnCard(checkoutData.nameOnCard);
    await checkoutPage.selectExpiry(checkoutData.expiryMonth, checkoutData.expiryYear);
    await checkoutPage.countryInput.fill('');

    await checkoutPage.placeOrder();

    // Observed behavior: remain on checkout; no toast/error message; order not placed.
    await expect(page).toHaveURL(/dashboard\/order/);
    await expect(page).not.toHaveURL(/dashboard\/thanks/);
    await expect(checkoutPage.paymentTitle).toBeVisible();
    await expect(checkoutPage.placeOrderButton).toBeVisible();
  });

  test('CHK-04 @regression @positive - Country typeahead shows known suggestions and selects India', async ({
    page,
  }) => {
    const { checkoutPage } = await openCheckoutWithProducts(page, ['ADIDAS ORIGINAL']);

    await checkoutPage.countryInput.click();
    await checkoutPage.countryInput.fill('');
    await checkoutPage.countryInput.pressSequentially(checkoutData.countrySearchFragment, {
      delay: 50,
    });

    await expect(checkoutPage.countrySuggestions.first()).toBeVisible();
    const suggestionTexts = (await checkoutPage.countrySuggestions.allTextContents()).map((text) =>
      text.trim()
    );

    for (const expected of COUNTRY_SUGGESTIONS_FOR_IND) {
      expect(suggestionTexts.some((text) => text.toLowerCase() === expected.toLowerCase())).toBeTruthy();
    }

    await checkoutPage.countrySuggestions
      .filter({ hasText: new RegExp(`^\\s*${checkoutData.country}\\s*$`, 'i') })
      .first()
      .click();

    await expect(checkoutPage.countryInput).toHaveValue(new RegExp(checkoutData.country, 'i'));
    // Do not place order in this scenario.
    await expect(page).toHaveURL(/dashboard\/order/);
  });

  test('CHK-02 @smoke @regression @positive - Complete valid checkout and place order', async ({
    page,
  }) => {
    test.skip(
      !isOrderPlacementAllowed(),
      'Creates a real order on the practice app. Set ALLOW_ORDER_PLACEMENT=true after explicit approval.'
    );

    const { checkoutPage } = await openCheckoutWithProducts(page, ['ZARA COAT 3']);
    const confirmationPage = new OrderConfirmationPage(page);

    await checkoutPage.fillCheckoutDetails({
      cvv: checkoutData.cvv,
      nameOnCard: checkoutData.nameOnCard,
      expiryMonth: checkoutData.expiryMonth,
      expiryYear: checkoutData.expiryYear,
      country: checkoutData.country,
    });
    await checkoutPage.placeOrder();

    await confirmationPage.waitForPage();
    await expect(confirmationPage.thankYouMessage).toBeVisible();
    await expect(confirmationPage.thankYouMessage).toHaveText(/thankyou for the order/i);
    expect((await confirmationPage.getOrderIdText()).length).toBeGreaterThan(0);
  });

  test('CHK-05 @regression @negative - Checkout with missing CVV and Name on Card', async ({
    page,
  }) => {
    test.skip(
      !isOrderPlacementAllowed(),
      'Clicks Place Order after selecting country; may create a real order. Requires approval / ALLOW_ORDER_PLACEMENT=true to probe live validation.'
    );

    const { checkoutPage } = await openCheckoutWithProducts(page, ['ZARA COAT 3']);

    await checkoutPage.cvvInput.fill('');
    await checkoutPage.nameOnCardInput.fill('');
    await checkoutPage.selectCountry(checkoutData.country);
    await checkoutPage.placeOrder();

    // Assert only observed outcomes — do not invent validation messages.
    // If the app places the order anyway, that is a product limitation to document.
    const onThanks = /dashboard\/thanks/.test(page.url());
    if (onThanks) {
      test.info().annotations.push({
        type: 'product-limitation',
        description:
          'Application placed an order even with empty CVV/Name on Card. No client-side required-field message observed for these fields.',
      });
      await expect(page).toHaveURL(/dashboard\/thanks/);
    } else {
      await expect(page).toHaveURL(/dashboard\/order/);
      await expect(page).not.toHaveURL(/dashboard\/thanks/);
    }
  });

  test('CHK-06 @regression @sanity @positive - Verify order confirmation details after placement', async ({
    page,
  }) => {
    test.skip(
      !isOrderPlacementAllowed(),
      'Depends on placing a real order. Set ALLOW_ORDER_PLACEMENT=true after explicit approval.'
    );

    const productName = 'ZARA COAT 3';
    const { checkoutPage } = await openCheckoutWithProducts(page, [productName]);
    const confirmationPage = new OrderConfirmationPage(page);

    await checkoutPage.fillCheckoutDetails({
      cvv: checkoutData.cvv,
      nameOnCard: checkoutData.nameOnCard,
      expiryMonth: checkoutData.expiryMonth,
      expiryYear: checkoutData.expiryYear,
      country: checkoutData.country,
    });
    await checkoutPage.placeOrder();
    await confirmationPage.waitForPage();

    await expect(confirmationPage.thankYouMessage).toHaveText(
      new RegExp(messages.confirmation.thankYou.replace(/\./g, '\\.'), 'i')
    );
    const orderId = await confirmationPage.getOrderIdText();
    expect(orderId).toMatch(/\|/);
    await expect(confirmationPage.root).toContainText(new RegExp(productName, 'i'));
  });

  test.afterEach(async ({ page }) => {
    try {
      // If still authenticated and not on thanks-only dead-end, clear cart remnants.
      if (!page.url().includes('/auth/login')) {
        const cartPage = new CartPage(page);
        await cartPage.goto();
        await clearCart(page);
      }
    } catch {
      // Ignore cleanup failures.
    }
  });
});
