import { test as base, expect } from '@playwright/test';
import { captureScenarioEvidence, ensureEvidenceDirectories } from '../utils/evidence';

/**
 * Framework test fixture:
 * - Ensures evidence directories exist
 * - Captures classified app screenshots after each test
 * - Attaches screenshots to the HTML report
 * - Never rethrows evidence errors (does not mask original failures)
 */
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    ensureEvidenceDirectories();
    await use(page);

    const evidence = await captureScenarioEvidence(page, testInfo);
    if (evidence.error) {
      // Already annotated inside captureScenarioEvidence when possible.
      console.warn(`[evidence] ${testInfo.title}: ${evidence.error}`);
    }
  },
});

export { expect };
