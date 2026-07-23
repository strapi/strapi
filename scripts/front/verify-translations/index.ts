#!/usr/bin/env tsx
import { discoverBundles, repoRoot } from './bundles';
import { writeTypesForBundle } from './generate-types';
import type { VerifyOptions, ValidationIssue } from './types';
import { fixLocaleFiles, validateBundle } from './validate';
import { readJsonRecord } from './bundles';

const parseArgs = (): VerifyOptions => {
  const args = process.argv.slice(2);

  return {
    fix: args.includes('--fix'),
    writeTypes: args.includes('--write-types'),
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
  const bundles = discoverBundles(options.bundleFilter);
  const adminBundle = bundles.find((bundle) => bundle.packageName === 'core/admin');

  if (!adminBundle) {
    console.error('Could not find core/admin translation bundle.');
    process.exit(1);
  }

  const adminEnJson = readJsonRecord(adminBundle.enJsonPath);
  const allIssues: ValidationIssue[] = [];
  let fixedLocales = 0;
  let writtenTypes = 0;

  if (options.fix) {
    for (const bundle of bundles) {
      fixedLocales += fixLocaleFiles(bundle);
    }

    if (fixedLocales > 0) {
      console.log(`Fixed ${fixedLocales} locale file(s). Re-run without --fix to verify.`);
    }
  }

  if (options.writeTypes) {
    for (const bundle of bundles) {
      if (writeTypesForBundle(bundle)) {
        writtenTypes += 1;
      }
    }

    console.log(`Wrote ${writtenTypes} keys.generated.ts file(s).`);
  }

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
