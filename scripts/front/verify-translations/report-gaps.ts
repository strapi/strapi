import path from 'node:path';

import { extractMessages } from './extract';
import { listLocaleFiles, readJsonRecord, repoRoot } from './bundles';
import type { MessageExtraction, TranslationBundle } from './types';

export interface GapUsage {
  file: string;
  line: number;
  defaultMessage: string | null;
}

export interface GapKeyReport {
  /** Key as stored in this bundle's en.json. */
  key: string;
  en: string;
  /** Locale codes (without .json) missing this key. */
  missingLocales: string[];
  /** Translations that already exist for this key in other locales. */
  presentLocales: Record<string, string>;
  /** Call sites that reference this key (best-effort from static extraction). */
  usages: GapUsage[];
}

export interface BundleGapReport {
  bundle: string;
  gaps: GapKeyReport[];
  summary: {
    enKeyCount: number;
    localeCount: number;
    keysWithGaps: number;
    missingOccurrences: number;
  };
}

export interface GapReport {
  generatedAt: string;
  bundles: BundleGapReport[];
  summary: {
    bundleCount: number;
    keysWithGaps: number;
    missingOccurrences: number;
  };
}

export interface ReportGapsOptions {
  /** Restrict which target locales appear in `missingLocales` (still includes others in presentLocales). */
  locales?: string[];
}

const localeCodeFromPath = (localePath: string) => path.basename(localePath, '.json');

const toRepoRelative = (filePath: string) => {
  const relative = path.relative(repoRoot, filePath);
  return relative.startsWith('..') ? filePath : relative.split(path.sep).join('/');
};

const usagesForKey = (key: string, extractions: MessageExtraction[]): GapUsage[] => {
  const usages: GapUsage[] = [];
  const seen = new Set<string>();

  for (const extraction of extractions) {
    const matches =
      extraction.jsonKey === key ||
      (extraction.expandedJsonKeys?.includes(key) ?? false) ||
      (extraction.messageId != null &&
        extraction.messageId.split('|').some((branch) => branch === key));

    if (!matches) {
      continue;
    }

    const file = toRepoRelative(extraction.file);
    const dedupe = `${file}:${extraction.line}`;
    if (seen.has(dedupe)) {
      continue;
    }
    seen.add(dedupe);

    usages.push({
      file,
      line: extraction.line,
      defaultMessage: extraction.defaultMessage,
    });
  }

  return usages;
};

/**
 * Deterministic gap report: keys present in en.json but missing from one or more locale files,
 * with sibling-locale values and code call-site context for downstream AI fill/review.
 */
export const buildGapReport = (
  bundles: TranslationBundle[],
  adminEnKeys: Set<string>,
  options: ReportGapsOptions = {}
): GapReport => {
  const localeFilter =
    options.locales && options.locales.length > 0 ? new Set(options.locales) : null;

  const bundleReports: BundleGapReport[] = [];
  let totalKeysWithGaps = 0;
  let totalMissingOccurrences = 0;

  for (const bundle of bundles) {
    const enJson = readJsonRecord(bundle.enJsonPath);
    const enKeys = Object.keys(enJson);
    const localePaths = listLocaleFiles(bundle);
    const locales = localePaths.map((localePath) => ({
      code: localeCodeFromPath(localePath),
      values: readJsonRecord(localePath),
    }));

    const extractions = extractMessages(bundle, adminEnKeys);
    const gaps: GapKeyReport[] = [];

    for (const key of enKeys) {
      const missingLocales: string[] = [];
      const presentLocales: Record<string, string> = {};

      for (const locale of locales) {
        if (key in locale.values) {
          presentLocales[locale.code] = locale.values[key]!;
          continue;
        }

        if (localeFilter && !localeFilter.has(locale.code)) {
          continue;
        }

        missingLocales.push(locale.code);
      }

      if (missingLocales.length === 0) {
        continue;
      }

      missingLocales.sort((a, b) => a.localeCompare(b));

      gaps.push({
        key,
        en: enJson[key]!,
        missingLocales,
        presentLocales,
        usages: usagesForKey(key, extractions),
      });
    }

    const missingOccurrences = gaps.reduce((sum, gap) => sum + gap.missingLocales.length, 0);
    totalKeysWithGaps += gaps.length;
    totalMissingOccurrences += missingOccurrences;

    bundleReports.push({
      bundle: bundle.packageName,
      gaps,
      summary: {
        enKeyCount: enKeys.length,
        localeCount: locales.length,
        keysWithGaps: gaps.length,
        missingOccurrences,
      },
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    bundles: bundleReports,
    summary: {
      bundleCount: bundleReports.length,
      keysWithGaps: totalKeysWithGaps,
      missingOccurrences: totalMissingOccurrences,
    },
  };
};
