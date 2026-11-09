/**
 * Shared helpers. Evidence APIs live in utils/evidence.ts and are re-exported here
 * for backward compatibility with earlier phases.
 */
export {
  captureEvidence,
  captureScenarioEvidence,
  buildEvidenceName,
  sanitizeEvidenceName,
  ensureEvidenceDirectories,
} from './evidence';
