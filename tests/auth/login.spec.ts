import { test, expect } from '../../fixtures/test';
import { LoginPage, ProductsPage } from '../../pages';
import { getValidUser, getInvalidUserById, getMessages } from '../../utils/test-data';

const messages = getMessages();

test.describe('Authentication business scenarios', () => {
  test('AUTH-01 @smoke @regression @positive - Login with valid credentials', async ({ page }) => {
    const user = getValidUser();
    const loginPage = new LoginPage(page);
    const productsPage = new ProductsPage(page);

    await loginPage.goto();
    await loginPage.login(user.email, user.password);

    await expect(page).toHaveURL(/dashboard\/dash/);
    await productsPage.waitForProductsToLoad();
    await expect(productsPage.productCards.first()).toBeVisible();
    await expect(productsPage.cartLink).toBeVisible();
    await expect(productsPage.ordersLink).toBeVisible();
  });

  test('AUTH-02 @regression @negative - Login with invalid email and invalid password', async ({
    page,
  }) => {
    const invalid = getInvalidUserById('both-invalid');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(invalid.email, invalid.password);

    await expect(loginPage.toastMessage.first()).toHaveText(messages.auth.invalidCredentialsToast);
    await expect(page).toHaveURL(/auth\/login/);
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('AUTH-03 @regression @negative - Login with valid email and invalid password', async ({
    page,
  }) => {
    const user = getValidUser();
    const invalid = getInvalidUserById('invalid-password');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(user.email, invalid.password);

    await expect(loginPage.toastMessage.first()).toHaveText(messages.auth.invalidCredentialsToast);
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('AUTH-04 @regression @negative - Login with invalid email and password-shaped value', async ({
    page,
  }) => {
    const invalid = getInvalidUserById('invalid-email');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(invalid.email, invalid.password);

    await expect(loginPage.toastMessage.first()).toHaveText(messages.auth.invalidCredentialsToast);
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('AUTH-05 @smoke @regression @negative - Login with empty email and empty password', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.clearCredentials();
    await loginPage.submit();

    await expect(loginPage.emailRequiredError).toBeVisible();
    await expect(loginPage.passwordRequiredError).toBeVisible();
    await expect(loginPage.emailRequiredError).toHaveText(messages.auth.emailRequired);
    await expect(loginPage.passwordRequiredError).toHaveText(messages.auth.passwordRequired);
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('AUTH-06 @regression @negative - Login with empty email only', async ({ page }) => {
    const invalid = getInvalidUserById('empty-email');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.fillEmail('');
    await loginPage.fillPassword(invalid.password);
    await loginPage.submit();

    await expect(loginPage.emailRequiredError).toBeVisible();
    await expect(loginPage.emailRequiredError).toHaveText(messages.auth.emailRequired);
    await expect(loginPage.passwordRequiredError).toBeHidden();
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('AUTH-07 @regression @negative - Login with empty password only', async ({ page }) => {
    const invalid = getInvalidUserById('empty-password');
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.fillEmail(invalid.email);
    await loginPage.fillPassword('');
    await loginPage.submit();

    await expect(loginPage.passwordRequiredError).toBeVisible();
    await expect(loginPage.passwordRequiredError).toHaveText(messages.auth.passwordRequired);
    await expect(page).toHaveURL(/auth\/login/);
  });
});
