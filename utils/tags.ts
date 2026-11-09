/**
 * Framework tagging convention.
 *
 * Tags are embedded in Playwright test titles so `--grep` / `--grep-invert` can filter them.
 * Prefer placing tags at the end of the title, space-separated.
 *
 * Categories (orthogonal — combine freely):
 * - Execution / suite classification: @smoke | @regression | @sanity
 * - Result expectation classification: @positive | @negative
 *
 * Examples:
 *   "valid login @smoke @positive"
 *   "empty password shows validation @regression @negative"
 *
 * Order-independent combined filters use positive lookaheads, e.g.:
 *   (?=.*@smoke)(?=.*@positive)
 *
 * Do not confuse Tags with:
 * - Modes (headed / headless / debug) — CLI execution style
 * - Projects (chromium, etc.) — browser/device targets in playwright.config.ts
 */

export const EXECUTION_TAGS = ['@smoke', '@regression', '@sanity'] as const;
export const TYPE_TAGS = ['@positive', '@negative'] as const;

export type ExecutionTag = (typeof EXECUTION_TAGS)[number];
export type TypeTag = (typeof TYPE_TAGS)[number];
export type TestTag = ExecutionTag | TypeTag;

/** Build an order-independent Playwright --grep pattern for multiple tags. */
export function tagsGrep(...tags: TestTag[]): string {
  return tags.map((tag) => `(?=.*${tag})`).join('');
}
