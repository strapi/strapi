export type ExtractionKind = 'static' | 'finite-enum' | 'schema-driven' | 'error-passthrough';

export interface MessageExtraction {
  file: string;
  line: number;
  kind: ExtractionKind;
  /** Key as stored in en.json (unprefixed for plugin bundles). */
  jsonKey: string | null;
  /** Runtime react-intl message id (prefixed for plugin bundles). */
  messageId: string | null;
  defaultMessage: string | null;
  /** For finite-enum: expanded json keys that must exist. */
  expandedJsonKeys?: string[];
  /** Human-readable note for skipped / dynamic patterns. */
  note?: string;
  /** Owning en.json: `'self'`, `'core/admin'`, or another bundle name. */
  targetBundle?: string;
}

export interface TranslationBundle {
  /** e.g. packages/core/content-manager */
  packagePath: string;
  /** e.g. core/content-manager */
  packageName: string;
  enJsonPath: string;
  translationsDir: string;
  /** null for core/admin — en.json keys are full message ids. */
  pluginPrefix: string | null;
  sourceDirs: string[];
}

export interface ValidationIssue {
  severity: 'error' | 'warning';
  bundle: string;
  code: string;
  message: string;
  file?: string;
  line?: number;
}

export interface VerifyOptions {
  fix: boolean;
  writeEn: boolean;
  /** With --write-en: overwrite existing en.json values from defaultMessage (code → catalog). */
  syncExisting: boolean;
  /** Emit a deterministic missing-locale gap report (JSON) with sibling-locale + call-site context. */
  reportGaps: boolean;
  /** Optional path for --report-gaps JSON output (default: stdout). */
  reportGapsOut?: string;
  /** Optional comma-separated locale codes to include as gap targets (e.g. fr,de). */
  locales?: string[];
  bundleFilter?: string;
}
