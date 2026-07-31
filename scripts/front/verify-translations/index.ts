#!/usr/bin/env tsx
import { discoverBundles, repoRoot } from './bundles';
import type { VerifyOptions, ValidationIssue } from './types';
import { fixLocaleFiles, validateBundle } from './validate';
import { readJsonRecord } from './bundles';
import { backfillMissingEnKeys } from './backfill-en';

const parseArgs = (): VerifyOptions => {
  const args = process.argv.slice(2);

  return {
    fix: args.includes('--fix'),
    bundleFilter: args.find((arg) => arg.startsWith('--bundle='))?.split('=')[1],
  };
};

const printIssues = (issues: ValidationIssue[]) => {
  for (const issue of issues) {
    const location = issue.file ? `${issue.file}:${issue.line ?? 0}: ` : '';
    console.error(`${location}[${issue.bundle}] ${issue.code}: ${issue.message}`);
  }
};

const main = () => {
  const options = parseArgs();
  const allBundles = discoverBundles();
  const bundles = options.bundleFilter ? discoverBundles(options.bundleFilter) : allBundles;
  const adminBundle = allBundles.find((bundle) => bundle.packageName === 'core/admin');

  if (!adminBundle) {
    console.error('Could not find core/admin translation bundle.');
    process.exit(1);
  }

  const allIssues: ValidationIssue[] = [];
  let fixedLocales = 0;

  if (options.fix) {
    // Close en.json gaps before pruning locales so translators' strings for live keys survive.
    const backfill = backfillMissingEnKeys(allBundles, adminBundle);

    if (backfill.addedKeys.length > 0) {
      console.log(
        `Backfilled ${backfill.addedKeys.length} missing key(s) into ${backfill.changedBundles} en.json file(s).`
      );
    }

    for (const bundle of bundles) {
      fixedLocales += fixLocaleFiles(bundle);
    }

    if (fixedLocales > 0) {
      console.log(`Fixed ${fixedLocales} locale file(s). Re-run without --fix to verify.`);
    }
  }

  const adminEnJson = readJsonRecord(adminBundle.enJsonPath);

  for (const bundle of bundles) {
    allIssues.push(...validateBundle(bundle, adminEnJson));
  }

  const errors = allIssues.filter((issue) => issue.severity === 'error');
  const warnings = allIssues.filter((issue) => issue.severity === 'warning');

  if (errors.length > 0) {
    printIssues(errors);
  }

  if (warnings.length > 0) {
    printIssues(warnings);
  }

  console.log(
    `verify-translations: ${errors.length} error(s), ${warnings.length} warning(s) across ${bundles.length} bundle(s) (cwd: ${repoRoot})`
  );

  if (errors.length > 0) {
    process.exit(1);
  }

  process.exit(0);
};

main();
