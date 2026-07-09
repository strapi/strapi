import fs from 'node:fs';

import { isAdminMessageId } from './patterns';
import { listLocaleFiles, readJsonRecord } from './bundles';
import { extractMessages, extractValidationErrorKeys } from './extract';
import type { MessageExtraction, TranslationBundle, ValidationIssue } from './types';

const normalizeMessage = (value: string) => value.replace(/\s+/g, ' ').trim();

const requiredJsonKeysFromExtraction = (extraction: MessageExtraction): string[] => {
  if (
    extraction.kind === 'schema-driven' ||
    extraction.kind === 'error-passthrough' ||
    extraction.targetBundle === 'core/admin'
  ) {
    return [];
  }

  if (extraction.expandedJsonKeys?.length) {
    return extraction.expandedJsonKeys;
  }

  if (extraction.jsonKey) {
    return [extraction.jsonKey];
  }

  return [];
};

const requiredAdminKeysFromExtraction = (extraction: MessageExtraction): string[] => {
  if (extraction.targetBundle !== 'core/admin') {
    return [];
  }

  if (extraction.messageId) {
    return [extraction.messageId];
  }

  return [];
};

const validateExtractions = (
  bundle: TranslationBundle,
  enJson: Record<string, string>,
  extractions: MessageExtraction[]
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const enKeys = new Set(Object.keys(enJson));

  for (const extraction of extractions) {
    if (extraction.targetBundle === 'core/admin') {
      continue;
    }

    const requiredKeys = requiredJsonKeysFromExtraction(extraction);

    for (const jsonKey of requiredKeys) {
      if (!enKeys.has(jsonKey)) {
        issues.push({
          severity: 'error',
          bundle: bundle.packageName,
          code: 'missing-en-key',
          message: `Message id "${jsonKey}" is used in code but missing from en.json`,
          file: extraction.file,
          line: extraction.line,
        });
      } else if (extraction.defaultMessage != null) {
        const enValue = enJson[jsonKey];
        const normalizedDefault = normalizeMessage(extraction.defaultMessage);
        const normalizedEn = normalizeMessage(enValue);

        if (normalizedDefault !== normalizedEn) {
          issues.push({
            severity: 'warning',
            bundle: bundle.packageName,
            code: 'default-message-drift',
            message: `defaultMessage for "${jsonKey}" does not match en.json.\n  code: ${extraction.defaultMessage}\n  en.json: ${enValue}`,
            file: extraction.file,
            line: extraction.line,
          });
        }
      }
    }
  }

  return issues;
};

const validateCrossPackageAdminKeys = (
  bundle: TranslationBundle,
  extractions: MessageExtraction[],
  adminEnJson: Record<string, string>
): ValidationIssue[] => {
  if (bundle.packageName === 'core/admin') {
    return [];
  }

  const issues: ValidationIssue[] = [];
  const adminKeys = new Set(Object.keys(adminEnJson));

  for (const extraction of extractions) {
    for (const adminKey of requiredAdminKeysFromExtraction(extraction)) {
      for (const branch of adminKey.split('|')) {
        if (!adminKeys.has(branch)) {
          issues.push({
            severity: 'error',
            bundle: bundle.packageName,
            code: 'missing-admin-key',
            message: `Cross-package admin message id "${branch}" is missing from core/admin en.json`,
            file: extraction.file,
            line: extraction.line,
          });
          continue;
        }

        if (extraction.defaultMessage != null) {
          const enValue = adminEnJson[branch];
          const normalizedDefault = normalizeMessage(extraction.defaultMessage);
          const normalizedEn = normalizeMessage(enValue);

          if (normalizedDefault !== normalizedEn) {
            issues.push({
              severity: 'error',
              bundle: bundle.packageName,
              code: 'default-message-drift',
              message: `defaultMessage for admin key "${branch}" does not match core/admin en.json.\n  code: ${extraction.defaultMessage}\n  en.json: ${enValue}`,
              file: extraction.file,
              line: extraction.line,
            });
          }
        }
      }
    }

    if (
      extraction.messageId &&
      extraction.targetBundle === 'core/admin' &&
      !extraction.messageId.includes('|') &&
      !adminKeys.has(extraction.messageId)
    ) {
      issues.push({
        severity: 'error',
        bundle: bundle.packageName,
        code: 'missing-admin-key',
        message: `Cross-package admin message id "${extraction.messageId}" is missing from core/admin en.json`,
        file: extraction.file,
        line: extraction.line,
      });
    }
  }

  return issues;
};

const validateErrorPassthroughKeys = (
  bundle: TranslationBundle,
  enJson: Record<string, string>,
  errorKeys: { local: string[]; admin: string[] }
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const enKeys = new Set(Object.keys(enJson));

  for (const key of errorKeys.local) {
    if (!enKeys.has(key)) {
      issues.push({
        severity: 'error',
        bundle: bundle.packageName,
        code: 'missing-validation-key',
        message: `Validation message key "${key}" is referenced in schemas but missing from en.json`,
      });
    }
  }

  return issues;
};

const validateAdminValidationKeys = (
  bundle: TranslationBundle,
  adminEnJson: Record<string, string>,
  errorKeys: { local: string[]; admin: string[] }
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const adminKeys = new Set(Object.keys(adminEnJson));

  for (const key of errorKeys.admin) {
    if (!adminKeys.has(key)) {
      issues.push({
        severity: 'error',
        bundle: bundle.packageName,
        code: 'missing-admin-validation-key',
        message: `Validation message key "${key}" is referenced in code but missing from core/admin en.json`,
      });
    }
  }

  return issues;
};

const validateLocaleFile = (
  bundle: TranslationBundle,
  enJson: Record<string, string>,
  localePath: string
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const localeName = localePath.split('/').pop() ?? localePath;
  const localeJson = readJsonRecord(localePath);
  const enKeyList = Object.keys(enJson);
  const localeKeys = Object.keys(localeJson);

  for (const key of enKeyList) {
    if (!(key in localeJson)) {
      issues.push({
        severity: 'error',
        bundle: bundle.packageName,
        code: 'missing-locale-key',
        message: `Locale ${localeName} is missing key "${key}" from en.json`,
      });
    }
  }

  for (const key of localeKeys) {
    if (!(key in enJson)) {
      issues.push({
        severity: 'error',
        bundle: bundle.packageName,
        code: 'extra-locale-key',
        message: `Locale ${localeName} has extra key "${key}" not present in en.json`,
      });
    }
  }

  if (enKeyList.join('\0') !== localeKeys.join('\0')) {
    issues.push({
      severity: 'error',
      bundle: bundle.packageName,
      code: 'locale-key-order',
      message: `Locale ${localeName} keys are not in the same order as en.json`,
    });
  }

  return issues;
};

export const validateBundle = (
  bundle: TranslationBundle,
  adminEnJson: Record<string, string>
): ValidationIssue[] => {
  const enJson = readJsonRecord(bundle.enJsonPath);
  const extractions = extractMessages(bundle, new Set(Object.keys(adminEnJson)));
  const errorKeys = extractValidationErrorKeys(bundle, new Set(Object.keys(adminEnJson)));

  return [
    ...validateExtractions(bundle, enJson, extractions),
    ...validateCrossPackageAdminKeys(bundle, extractions, adminEnJson),
    ...validateErrorPassthroughKeys(bundle, enJson, errorKeys),
    ...validateAdminValidationKeys(bundle, adminEnJson, errorKeys),
    ...listLocaleFiles(bundle).flatMap((localePath) =>
      validateLocaleFile(bundle, enJson, localePath)
    ),
  ];
};

export const fixLocaleFiles = (bundle: TranslationBundle): number => {
  const enJson = readJsonRecord(bundle.enJsonPath);
  let fixed = 0;

  for (const localePath of listLocaleFiles(bundle)) {
    const localeJson = readJsonRecord(localePath);
    const reordered: Record<string, string> = {};

    for (const key of Object.keys(enJson)) {
      reordered[key] = localeJson[key] ?? enJson[key];
    }

    const nextContent = `${JSON.stringify(reordered, null, 2)}\n`;
    const currentContent = fs.readFileSync(localePath, 'utf8');

    if (currentContent !== nextContent) {
      fs.writeFileSync(localePath, nextContent);
      fixed += 1;
    }
  }

  return fixed;
};
