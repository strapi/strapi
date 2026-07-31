import fs from 'node:fs';

import { readJsonRecord } from './bundles';
import { extractMessages } from './extract';
import type { MessageExtraction, TranslationBundle, ValidationIssue } from './types';

const normalizeMessage = (value: string) => value.replace(/\s+/g, ' ').trim();

export interface WriteEnResult {
  changed: boolean;
  updatedKeys: string[];
  addedKeys: string[];
  conflicts: ValidationIssue[];
}

interface Candidate {
  value: string;
  count: number;
  file?: string;
  line?: number;
}

const collectSelfDefaultMessages = (
  bundle: TranslationBundle,
  extractions: MessageExtraction[],
  currentEn: Record<string, string>
): {
  values: Map<string, string>;
  conflicts: ValidationIssue[];
} => {
  const candidates = new Map<string, Map<string, Candidate>>();
  const conflicts: ValidationIssue[] = [];

  for (const extraction of extractions) {
    if (
      extraction.targetBundle === 'core/admin' ||
      extraction.kind === 'schema-driven' ||
      extraction.kind === 'error-passthrough' ||
      extraction.kind === 'finite-enum' ||
      extraction.defaultMessage == null
    ) {
      continue;
    }

    if (extraction.expandedJsonKeys && extraction.expandedJsonKeys.length > 1) {
      continue;
    }

    const keys = extraction.jsonKey ? [extraction.jsonKey] : [];

    for (const jsonKey of keys) {
      if (!jsonKey || jsonKey.includes('${')) {
        continue;
      }

      const normalized = normalizeMessage(extraction.defaultMessage);
      if (!candidates.has(jsonKey)) {
        candidates.set(jsonKey, new Map());
      }

      const byNorm = candidates.get(jsonKey)!;
      const existing = byNorm.get(normalized);

      if (existing) {
        existing.count += 1;
      } else {
        byNorm.set(normalized, {
          value: extraction.defaultMessage,
          count: 1,
          file: extraction.file,
          line: extraction.line,
        });
      }
    }
  }

  const values = new Map<string, string>();

  for (const [jsonKey, byNorm] of candidates) {
    const options = [...byNorm.values()].sort((a, b) => b.count - a.count);
    const current = currentEn[jsonKey];
    const matchingCurrent =
      current != null
        ? options.find((option) => normalizeMessage(option.value) === normalizeMessage(current))
        : undefined;

    const chosen = matchingCurrent ?? options[0]!;
    values.set(jsonKey, chosen.value);

    if (options.length > 1) {
      for (const option of options) {
        if (normalizeMessage(option.value) === normalizeMessage(chosen.value)) {
          continue;
        }

        conflicts.push({
          severity: 'warning',
          bundle: bundle.packageName,
          code: 'en-default-conflict',
          message: `Multiple defaultMessage values for "${jsonKey}"; synced en.json to the majority/existing value.\n  kept: ${chosen.value}\n  also: ${option.value}`,
          file: option.file,
          line: option.line,
        });
      }
    }
  }

  return { values, conflicts };
};

/**
 * Sync this bundle's en.json from in-code defaultMessage (code is canonical English).
 * Adds missing keys and overwrites drifted values. Does not delete unused keys.
 * When call sites disagree, prefers a value already matching en.json, else majority.
 */
export const writeEnJsonForBundle = (
  bundle: TranslationBundle,
  adminEnKeys: Set<string>
): WriteEnResult => {
  const enJson = readJsonRecord(bundle.enJsonPath);
  const extractions = extractMessages(bundle, adminEnKeys);
  const { values, conflicts } = collectSelfDefaultMessages(bundle, extractions, enJson);

  const updatedKeys: string[] = [];
  const addedKeys: string[] = [];

  for (const [key, value] of values) {
    if (!(key in enJson)) {
      enJson[key] = value;
      addedKeys.push(key);
      continue;
    }

    if (normalizeMessage(enJson[key]) !== normalizeMessage(value)) {
      enJson[key] = value;
      updatedKeys.push(key);
    }
  }

  const changed = addedKeys.length > 0 || updatedKeys.length > 0;

  if (changed) {
    fs.writeFileSync(bundle.enJsonPath, `${JSON.stringify(enJson, null, 2)}\n`);
  }

  return { changed, updatedKeys, addedKeys, conflicts };
};
