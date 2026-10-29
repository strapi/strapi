import fs from 'node:fs';

import { readJsonRecord } from './bundles';
import { extractMessages } from './extract';
import type { MessageExtraction, TranslationBundle } from './types';

export interface BackfillResult {
  changedBundles: number;
  addedKeys: Array<{ bundle: string; key: string }>;
}

const pickDefaultMessage = (extraction: MessageExtraction, existing: Map<string, string>): void => {
  if (
    extraction.kind === 'schema-driven' ||
    extraction.kind === 'error-passthrough' ||
    extraction.kind === 'finite-enum' ||
    extraction.defaultMessage == null
  ) {
    return;
  }

  if (extraction.expandedJsonKeys && extraction.expandedJsonKeys.length > 1) {
    return;
  }

  const keys: string[] = [];

  if (extraction.targetBundle === 'core/admin' && extraction.messageId) {
    for (const branch of extraction.messageId.split('|')) {
      if (branch && !branch.includes('${')) {
        keys.push(branch);
      }
    }
  } else if (extraction.jsonKey && !extraction.jsonKey.includes('${')) {
    keys.push(extraction.jsonKey);
  }

  for (const key of keys) {
    if (!existing.has(key)) {
      existing.set(key, extraction.defaultMessage);
    }
  }
};

const writeAddedKeys = (
  enJsonPath: string,
  enJson: Record<string, string>,
  additions: Map<string, string>
): string[] => {
  const added: string[] = [];

  for (const [key, value] of additions) {
    if (key in enJson) {
      continue;
    }

    enJson[key] = value;
    added.push(key);
  }

  if (added.length > 0) {
    fs.writeFileSync(enJsonPath, `${JSON.stringify(enJson, null, 2)}\n`);
  }

  return added;
};

/**
 * Close en.json gaps that `--fix` would otherwise prune from locales: add keys used in
 * code (with a defaultMessage) that are missing from the owning en.json. Does not update
 * existing values (add-only).
 */
export const backfillMissingEnKeys = (
  bundles: TranslationBundle[],
  adminBundle: TranslationBundle
): BackfillResult => {
  const addedKeys: Array<{ bundle: string; key: string }> = [];
  let changedBundles = 0;

  let adminEnJson = readJsonRecord(adminBundle.enJsonPath);
  let adminEnKeys = new Set(Object.keys(adminEnJson));

  // Self-bundle keys first (including core/admin).
  for (const bundle of bundles) {
    const enJson = readJsonRecord(bundle.enJsonPath);
    const extractions = extractMessages(bundle, adminEnKeys);
    const additions = new Map<string, string>();

    for (const extraction of extractions) {
      if (extraction.targetBundle === 'core/admin') {
        continue;
      }

      pickDefaultMessage(extraction, additions);
    }

    // Prefer defaultMessage; if several call sites disagree, first wins (add-only).
    const added = writeAddedKeys(bundle.enJsonPath, enJson, additions);

    if (added.length > 0) {
      changedBundles += 1;
      for (const key of added) {
        addedKeys.push({ bundle: bundle.packageName, key });
      }
    }

    if (bundle.packageName === 'core/admin') {
      adminEnJson = readJsonRecord(adminBundle.enJsonPath);
      adminEnKeys = new Set(Object.keys(adminEnJson));
    }
  }

  // Cross-package admin ids referenced from plugins (and EE packages).
  adminEnJson = readJsonRecord(adminBundle.enJsonPath);
  adminEnKeys = new Set(Object.keys(adminEnJson));
  const adminAdditions = new Map<string, string>();

  for (const bundle of bundles) {
    if (bundle.packageName === 'core/admin') {
      continue;
    }

    const extractions = extractMessages(bundle, adminEnKeys);

    for (const extraction of extractions) {
      if (extraction.targetBundle !== 'core/admin') {
        continue;
      }

      pickDefaultMessage(extraction, adminAdditions);
    }
  }

  // Drop keys already present (pickDefaultMessage only skips within the map).
  for (const key of adminAdditions.keys()) {
    if (key in adminEnJson) {
      adminAdditions.delete(key);
    }
  }

  const adminAdded = writeAddedKeys(adminBundle.enJsonPath, adminEnJson, adminAdditions);

  if (adminAdded.length > 0) {
    changedBundles += 1;
    for (const key of adminAdded) {
      addedKeys.push({ bundle: 'core/admin', key });
    }
  }

  return { changedBundles, addedKeys };
};
