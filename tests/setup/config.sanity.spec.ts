import { test, expect } from '../../fixtures/test';
import { getCredentials, getBaseUrl } from '../../utils/env';

/**
 * Framework configuration checks — not business scenarios.
 * Tags: @sanity @positive / @sanity @negative
 */
test.describe('Framework configuration', () => {
  test('loads required environment credentials without exposing secrets @sanity @positive', async () => {
    const credentials = getCredentials();

    expect(credentials.username.length).toBeGreaterThan(0);
    expect(credentials.password.length).toBeGreaterThan(0);
    expect(credentials.username).toContain('@');

    // Safety: never assert or log raw password values
    expect(process.env.TEST_PASSWORD).toBeDefined();
  });

  test('resolves application base URL @sanity @positive', async () => {
    const baseUrl = getBaseUrl();
    expect(baseUrl).toContain('rahulshettyacademy.com/client');
  });

  test('getCredentials fails clearly when TEST_USERNAME is missing @sanity @negative', async () => {
    const original = process.env.TEST_USERNAME;
    delete process.env.TEST_USERNAME;

    try {
      expect(() => getCredentials()).toThrow(/TEST_USERNAME/);
    } finally {
      if (original === undefined) {
        delete process.env.TEST_USERNAME;
      } else {
        process.env.TEST_USERNAME = original;
      }
    }
  });
});
