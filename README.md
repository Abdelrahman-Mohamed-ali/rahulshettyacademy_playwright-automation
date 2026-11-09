# Playwright Automation Framework

End-to-end Playwright + TypeScript framework for the Rahul Shetty Academy Client app  
(`https://rahulshettyacademy.com/client/#/auth/login`).

## Technology stack

- Playwright Test
- TypeScript
- Page Object Model (POM)
- dotenv (local secrets)
- GitHub Actions

## Quick start

```bash
npm install
npx playwright install chromium
cp .env.example .env
# Set TEST_USERNAME and TEST_PASSWORD in .env
npm test
```

## Tags vs Modes vs Projects

These are **not interchangeable**:

| Concept | What it is | How you control it |
|---|---|---|
| **Tags** | Classification labels in test titles (`@smoke`, `@positive`, …) | `--grep` / `--grep-invert` or npm scripts |
| **Modes** | How the browser runs: headed, headless, debug | `--headed`, default headless, `--debug` |
| **Projects** | Browser/device targets in `playwright.config.ts` | Currently `chromium` only |

## Tag strategy

Tags are appended to test titles and filtered with Playwright’s regex greps.

### Execution / suite classification

| Tag | Meaning |
|---|---|
| `@smoke` | Critical path / fast confidence checks |
| `@regression` | Broader functional coverage |
| `@sanity` | Framework/config/health checks |

### Test type classification

| Tag | Meaning |
|---|---|
| `@positive` | Valid flow; app should accept / succeed |
| `@negative` | Invalid flow; app should reject / remain safe |

Combine freely, for example:

- `@smoke @positive`
- `@regression @negative`
- `@sanity @positive`

Tag order in the title does **not** matter when using lookahead grep patterns.

Convention helper: `utils/tags.ts`

## Mode strategy

| Mode | Behavior | Command |
|---|---|---|
| **Headless** (default) | No visible browser UI | `npx playwright test` or `npm run test:headless` |
| **Headed** | Visible browser | `npx playwright test --headed` or `npm run test:headed` |
| **Debug** | Playwright Inspector / step debugging | `npx playwright test --debug` or `npm run test:debug` |

`playwright.config.ts` sets `use.headless: true` by default.

## Common commands

### All tests

```bash
npm test
npm run test:list
```

### By tag

```bash
npm run test:smoke
npm run test:regression
npm run test:sanity
npm run test:positive
npm run test:negative
```

### By mode

```bash
npm run test:headed
npm run test:headless
npm run test:debug
```

### Combined tags (order-independent)

```bash
npm run test:smoke:positive
npm run test:regression:negative
npm run test:sanity:positive
npm run test:sanity:negative
```

Equivalent raw Playwright examples:

```bash
npx playwright test --grep "(?=.*@smoke)(?=.*@positive)"
npx playwright test --grep "(?=.*@regression)(?=.*@negative)"
npx playwright test --grep "@smoke" --grep-invert "@negative"
```

**Windows PowerShell note:** quote tags when calling Playwright directly (`--grep "@smoke"`), because bare `@smoke` is treated as a PowerShell splat. Prefer the npm scripts above — they are already safe cross-platform.

### Combined tags + modes

```bash
npm run test:smoke:headed
npm run test:regression:headless
npm run test:negative:debug
npm run test:smoke:positive:headed
npm run test:regression:negative:headless
npm run test:sanity:negative:debug
```

## Execution matrix

| Goal | Command |
|---|---|
| All tests, headless (default) | `npm test` |
| All tests, headed | `npm run test:headed` |
| Smoke only | `npm run test:smoke` |
| Sanity only | `npm run test:sanity` |
| Positive only | `npm run test:positive` |
| Negative only | `npm run test:negative` |
| Smoke + Positive | `npm run test:smoke:positive` |
| Regression + Negative | `npm run test:regression:negative` |
| Smoke + Headed | `npm run test:smoke:headed` |
| Regression + Headless | `npm run test:regression:headless` |
| Negative + Debug | `npm run test:negative:debug` |
| HTML report | `npm run report` |
| Typecheck | `npm run typecheck` |

## Environment variables

Copy `.env.example` to `.env` (gitignored):

```bash
TEST_USERNAME=your_username_here
TEST_PASSWORD=your_password_here
```

Never hardcode credentials in tests. For CI, use GitHub Secrets with the same names.

## Project structure

```text
pages/           # Page Objects (POM)
fixtures/        # Shared Playwright test fixture (auto evidence)
tests/
  setup/         # Framework/config/POM smoke + evidence checks
  auth/          # AUTH-01..07 login scenarios
  cart/          # PRD + cart + RemoveItem scenarios
  checkout/      # CHK checkout scenarios
utils/           # env, session, evidence, helpers, tags, routes
test-data/       # JSON fixtures / messages
docs/            # Exploration report + scenario inventory
evidence/
  app/
    positive/    # Passed @positive scenario screenshots
    negative/    # Passed @negative scenario screenshots
    failed/      # Failed/timed-out scenario screenshots
  reports/html/  # Screenshots of the Playwright HTML report itself
  exploration/   # Phase 3 exploration captures
playwright-report/  # Generated HTML report (gitignored)
test-results/       # Traces/videos/built-in screenshots (gitignored)
```

## Business test execution

Scenario design: `docs/test-scenario-inventory.md`

```bash
# Authentication
npx playwright test tests/auth

# Products + cart contents
npx playwright test tests/cart

# Dynamic RemoveItem (CART-02..CART-06)
npx playwright test tests/cart/remove-item.spec.ts

# Checkout (order placement tests are skipped unless approved)
npx playwright test tests/checkout

# Auth negatives only
npx playwright test tests/auth --grep "@negative"

# Smoke business + setup
npm run test:smoke
```

### Order placement guard

CHK-02 / CHK-05 / CHK-06 can create **real orders** on the shared practice account.  
They stay skipped unless you explicitly approve and set:

```bash
# PowerShell
$env:ALLOW_ORDER_PLACEMENT="true"
npx playwright test tests/checkout --grep "CHK-02"
```

### Shared account note

`playwright.config.ts` uses `workers: 1` because cart state is shared for the practice user.

## Screenshots and HTML reporting

### Application screenshots

Every test that uses the shared `fixtures/test` page fixture captures classified evidence after completion:

| Outcome | Folder |
|---|---|
| Passed `@positive` | `evidence/app/positive/` |
| Passed `@negative` | `evidence/app/negative/` |
| Failed / timed out | `evidence/app/failed/` |

Naming convention:

```text
{SCENARIO-ID}-{positive|negative}-{slug}-{passed|failed}.png
```

Examples:

- `AUTH-01-positive-Login-with-valid-credentials-passed.png`
- `AUTH-05-negative-Login-with-empty-email-and-empty-password-passed.png`
- `CART-05-negative-Removing-a-nonexistent-product-leaves-cart-unchanged-passed.png`

Screenshots are also attached via `testInfo.attach()` and appear inside the HTML report.

Playwright built-in `screenshot: 'on'` and `video: 'retain-on-failure'` remain enabled.

### HTML report

```bash
npm test
npm run report
# or
npx playwright show-report
```

Note: if you pass `--reporter=list` on the CLI, also include `--reporter=html`  
(or omit CLI reporters) so the HTML report is still generated from `playwright.config.ts`.

### HTML report screenshots (separate from app screenshots)

After tests generate `playwright-report/`:

```bash
npm run report:capture
```

Saves report UI captures under `evidence/reports/html/` (overview, passed/failed filters when available, positive/negative search views).

Quick local demo (AUTH-01 positive + AUTH-05 negative, then report screenshots):

```bash
npm run evidence:demo
```

### Controlled failure evidence (optional)

```powershell
$env:RUN_FAILURE_EVIDENCE="true"
npx playwright test tests/setup/evidence.failure.spec.ts
```

This is skipped by default and does not run during normal suites.

## GitHub Actions CI/CD

Workflow file: `.github/workflows/playwright.yml`

### Overview

GitHub Actions runs Playwright **headless** against the practice app using repository secrets.  
The job uses `workers: 1` (from `playwright.config.ts`) and a **concurrency group** so only one Playwright workflow runs at a time on the shared account.

### Triggers

| Trigger | Behavior |
|---|---|
| Push to `main` / `master` | Runs **smoke** tests |
| Pull request targeting `main` / `master` | Runs **smoke** tests |
| `workflow_dispatch` (Actions → Run workflow) | Manual group selection |

### Manual execution options

In the Actions tab → **Playwright E2E** → **Run workflow**, choose:

| Group | Command |
|---|---|
| `all` | `npx playwright test --reporter=list --reporter=html` |
| `smoke` | `--grep @smoke` |
| `regression` | `--grep @regression` |
| `positive` | `--grep @positive` |
| `negative` | `--grep @negative` |

### Required GitHub Secrets

Repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret | Purpose |
|---|---|
| `TEST_USERNAME` | Practice-app login email |
| `TEST_PASSWORD` | Practice-app login password |

Never commit `.env`. It is listed in `.gitignore`.

### Safety controls (CI)

The workflow **always** sets:

- `ALLOW_ORDER_PLACEMENT=false` — CHK-02 / CHK-05 / CHK-06 stay skipped
- `RUN_FAILURE_EVIDENCE=false` — controlled failure test stays skipped
- Headless mode only
- No `.env` upload

### Artifacts (uploaded with `if: always()`)

| Artifact | Path | Retention |
|---|---|---|
| `playwright-html-report-<run>-<group>` | `playwright-report/` | 14 days |
| `evidence-app-<run>-<group>` | `evidence/app/` | 14 days |
| `evidence-report-html-<run>-<group>` | `evidence/reports/html/` | 14 days |
| `playwright-test-results-<run>-<group>` | `test-results/` | 7 days |

### Download and inspect artifacts

1. Open the workflow run on GitHub.
2. Scroll to **Artifacts**.
3. Download the HTML report zip, extract, then open `index.html` locally  
   or run `npx playwright show-report` against the extracted folder.
4. Download `evidence-app-*` for Positive/Negative/Failed screenshots.
5. Download `evidence-report-html-*` for screenshots of the report UI itself.

### Troubleshoot failed workflows

1. Confirm `TEST_USERNAME` / `TEST_PASSWORD` secrets exist and are correct.
2. Open the failed job logs (secrets are never printed).
3. Download `playwright-html-report-*` and `playwright-test-results-*`.
4. Check traces/videos under `test-results/` for failed tests.
5. If cart state looks polluted, re-run manually with `smoke` after other jobs finish  
   (concurrency prevents overlap, but the shared account can still retain cart items).

### Local commands that mirror CI

```bash
npm ci
npx playwright install chromium
npm run typecheck
npm run test:ci:smoke
npm run report:capture
```
