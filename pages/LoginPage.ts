import { Locator, Page } from '@playwright/test';
import { routes } from '../utils/routes';

/**
 * Login page for /client/#/auth/login
 * Pre-auth page — does not extend BasePage (no authenticated header).
 * Toast locator mirrors BasePage for consistency without inheritance coupling.
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly emailRequiredError: Locator;
  readonly passwordRequiredError: Locator;
  readonly toastContainer: Locator;
  readonly toastMessage: Locator;

  static readonly EMAIL_REQUIRED_TEXT = '*Email is required';
  static readonly PASSWORD_REQUIRED_TEXT = '*Password is required';
  static readonly INVALID_CREDENTIALS_TOAST = 'Incorrect email or password.';

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#userEmail');
    this.passwordInput = page.locator('#userPassword');
    this.loginButton = page.locator('#login');
    this.emailRequiredError = page.getByText(LoginPage.EMAIL_REQUIRED_TEXT);
    this.passwordRequiredError = page.getByText(LoginPage.PASSWORD_REQUIRED_TEXT);
    this.toastContainer = page.locator('#toast-container');
    this.toastMessage = page.locator('#toast-container .toast-message');
  }

  async goto(): Promise<void> {
    await this.page.goto(routes.login);
    await this.emailInput.waitFor({ state: 'visible' });
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async clearCredentials(): Promise<void> {
    await this.emailInput.fill('');
    await this.passwordInput.fill('');
  }

  async submit(): Promise<void> {
    await this.loginButton.click();
  }

  /**
   * Performs login without asserting success/failure.
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async getToastText(): Promise<string> {
    await this.toastMessage.first().waitFor({ state: 'visible' });
    return (await this.toastMessage.first().innerText()).trim();
  }

  async isDisplayed(): Promise<boolean> {
    return this.loginButton.isVisible();
  }
}
