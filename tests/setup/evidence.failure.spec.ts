import { test, expect } from '../../fixtures/test';

/**
 * Isolated failure-evidence validation.
 * Runs only when RUN_FAILURE_EVIDENCE=true so normal suites stay green.
 */
test.describe('Evidence failure capture', () => {
  test('EVID-FAIL @sanity @negative - Controlled failure for screenshot validation', async ({
    page,
  }) => {
    test.skip(
      process.env.RUN_FAILURE_EVIDENCE !== 'true',
      'Set RUN_FAILURE_EVIDENCE=true to validate failure screenshots in isolation.'
    );

    await page.goto('/client/#/auth/login');
    await expect(page.locator('#userEmail')).toBeVisible();
    // Intentional assertion failure — used only for evidence pipeline validation.
    await expect(page.locator('#userEmail'), 'controlled failure').toHaveAttribute(
      'data-evidence',
      'must-fail'
    );
  });
});
