import { Page, TestInfo } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export type EvidenceClassification = 'positive' | 'negative' | 'unclassified';
export type EvidenceResult = 'passed' | 'failed' | 'timedOut' | 'interrupted' | 'skipped' | 'unknown';

export interface CaptureEvidenceOptions {
  fullPage?: boolean;
  /** Force folder classification; otherwise inferred from tags / status. */
  classification?: EvidenceClassification;
  /** Attach name shown in the HTML report. Defaults to sanitized filename stem. */
  attachAs?: string;
  /** When false, skip testInfo.attach (filesystem only). Default true. */
  attach?: boolean;
}

const APP_EVIDENCE_ROOT = path.resolve('evidence', 'app');
const REPORT_EVIDENCE_ROOT = path.resolve('evidence', 'reports', 'html');

export function sanitizeEvidenceName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

export function extractScenarioId(title: string): string {
  // Supports AUTH-01, CART-03, CHK-04, EVID-FAIL, etc.
  const match = title.match(/\b([A-Z]{2,12}-[A-Z0-9]{1,12})\b/);
  return match?.[1] ?? 'SCENARIO';
}

export function extractClassification(title: string): EvidenceClassification {
  if (/@negative\b/i.test(title)) return 'negative';
  if (/@positive\b/i.test(title)) return 'positive';
  return 'unclassified';
}

export function mapStatusToResult(status: TestInfo['status']): EvidenceResult {
  switch (status) {
    case 'passed':
    case 'failed':
    case 'timedOut':
    case 'interrupted':
    case 'skipped':
      return status;
    default:
      return 'unknown';
  }
}

/**
 * Build a canonical evidence filename stem.
 * Example: AUTH-01-positive-login-with-valid-credentials-passed
 */
export function buildEvidenceName(parts: {
  scenarioId?: string;
  classification?: EvidenceClassification;
  description?: string;
  result?: EvidenceResult;
}): string {
  const chunks = [
    parts.scenarioId ?? 'SCENARIO',
    parts.classification && parts.classification !== 'unclassified'
      ? parts.classification
      : undefined,
    parts.description,
    parts.result,
  ].filter(Boolean) as string[];

  return sanitizeEvidenceName(chunks.join('-'));
}

function resolveAppFolder(
  classification: EvidenceClassification,
  result: EvidenceResult
): string {
  if (result === 'failed' || result === 'timedOut' || result === 'interrupted') {
    return path.join(APP_EVIDENCE_ROOT, 'failed');
  }
  if (classification === 'negative') {
    return path.join(APP_EVIDENCE_ROOT, 'negative');
  }
  if (classification === 'positive') {
    return path.join(APP_EVIDENCE_ROOT, 'positive');
  }
  return path.join(APP_EVIDENCE_ROOT, 'positive');
}

/**
 * Capture a named application screenshot and optionally attach it to the HTML report.
 * Never logs credential values. Soft-fails only when called via captureScenarioEvidence.
 */
export async function captureEvidence(
  page: Page,
  name: string,
  options: CaptureEvidenceOptions = {},
  testInfo?: TestInfo
): Promise<string> {
  const safeName = sanitizeEvidenceName(name);
  const classification = options.classification ?? 'unclassified';
  const resultHint: EvidenceResult =
    testInfo?.status === 'failed' || testInfo?.status === 'timedOut'
      ? mapStatusToResult(testInfo.status)
      : 'passed';

  const folder = resolveAppFolder(classification, resultHint);
  fs.mkdirSync(folder, { recursive: true });

  const filePath = path.join(folder, `${safeName}.png`);

  await page.screenshot({
    path: filePath,
    fullPage: options.fullPage ?? true,
  });

  if (options.attach !== false) {
    const info = testInfo;
    if (info) {
      await info.attach(options.attachAs ?? safeName, {
        path: filePath,
        contentType: 'image/png',
      });
    }
  }

  return filePath;
}

/**
 * Automatic end-of-test evidence capture.
 * Distinguishes Positive vs Negative by tags in the title, and failed runs by status.
 * Errors are returned (not thrown) so original test failures are never masked.
 */
export async function captureScenarioEvidence(
  page: Page,
  testInfo: TestInfo
): Promise<{ filePath?: string; error?: string }> {
  if (testInfo.status === 'skipped') {
    return {};
  }

  // Closed / crashed pages cannot be screenshotted.
  if (page.isClosed()) {
    return { error: 'Page already closed; skipped evidence capture' };
  }

  const title = testInfo.title;
  const scenarioId = extractScenarioId(title);
  const classification = extractClassification(title);
  const result = mapStatusToResult(testInfo.status);
  const description = sanitizeEvidenceName(
    title
      .replace(/\b[A-Z]{2,12}-[A-Z0-9]{1,12}\b/g, '')
      .replace(/@[a-zA-Z0-9_-]+/g, '')
      .replace(/[-–—]/g, ' ')
      .trim() || 'state'
  );

  const evidenceName = buildEvidenceName({
    scenarioId,
    classification,
    description,
    result,
  });

  try {
    const filePath = await captureEvidence(
      page,
      evidenceName,
      {
        classification,
        attachAs: `${scenarioId} ${classification} ${result}`,
        fullPage: true,
      },
      testInfo
    );
    return { filePath };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    testInfo.annotations.push({
      type: 'evidence-warning',
      description: `Evidence capture failed: ${message}`,
    });
    return { error: message };
  }
}

export function ensureEvidenceDirectories(): void {
  for (const dir of [
    path.join(APP_EVIDENCE_ROOT, 'positive'),
    path.join(APP_EVIDENCE_ROOT, 'negative'),
    path.join(APP_EVIDENCE_ROOT, 'failed'),
    REPORT_EVIDENCE_ROOT,
    path.resolve('evidence', 'exploration'),
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export { APP_EVIDENCE_ROOT, REPORT_EVIDENCE_ROOT };
