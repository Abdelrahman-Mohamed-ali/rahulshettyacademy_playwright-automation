import { Page } from '@playwright/test';
import { LoginPage, ProductsPage, CartPage, CheckoutPage } from '../pages';
import { getValidUser } from './test-data';

/**
 * Shared authenticated session helpers for business specs.
 * Cart state is server-side for the shared practice account — callers should
 * clear or seed the cart explicitly for independence.
 */
export async function loginAsValidUser(page: Page): Promise<void> {
  const user = getValidUser();
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(user.email, user.password);
  await page.waitForURL(/dashboard/);
}

export async function clearCart(page: Page): Promise<void> {
  const cartPage = new CartPage(page);
  await cartPage.goto();
  const results = await cartPage.removeAllItems();
  const failed = results.find((result) => result.status === 'removal-failed');
  if (failed && failed.status === 'removal-failed') {
    throw new Error(`clearCart failed: ${failed.detail}`);
  }
  await cartPage.waitForCartToSettle();
}

export async function loginAndClearCart(page: Page): Promise<void> {
  await loginAsValidUser(page);
  await clearCart(page);
}

export async function addProductsToEmptyCart(page: Page, productNames: string[]): Promise<void> {
  await clearCart(page);
  const productsPage = new ProductsPage(page);
  await productsPage.goto();
  await productsPage.addProductsToCart(productNames);
}

export async function openCheckoutWithProducts(page: Page, productNames: string[]): Promise<{
  productsPage: ProductsPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
}> {
  await addProductsToEmptyCart(page, productNames);
  const productsPage = new ProductsPage(page);
  const cartPage = new CartPage(page);
  const checkoutPage = new CheckoutPage(page);
  await cartPage.goto();
  await cartPage.proceedToCheckout();
  await checkoutPage.waitForPage();
  return { productsPage, cartPage, checkoutPage };
}

/** Guard for scenarios that may create real orders on the practice app. */
export function isOrderPlacementAllowed(): boolean {
  return process.env.ALLOW_ORDER_PLACEMENT === 'true';
}
