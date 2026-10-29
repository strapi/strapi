#!/usr/bin/env tsx
import fs from 'node:fs';

import { discoverBundles, readJsonRecord, repoRoot } from './bundles';
import type { VerifyOptions, ValidationIssue } from './types';
import { fixLocaleFiles, validateBundle } from './validate';
import { backfillMissingEnKeys } from './backfill-en';
import { writeEnJsonForBundle } from './write-en';
import { alignDefaultMessages } from './align-defaults';
import { buildGapReport } from './report-gaps';

const parseArgs = (): VerifyOptions => {
  const args = process.argv.slice(2);
  const localesArg = args.find((arg) => arg.startsWith('--locale='))?.split('=')[1];
  const outArg = args.find((arg) => arg.startsWith('--out='))?.split('=')[1];

  return {
    fix: args.includes('--fix'),
    writeEn: args.includes('--write-en'),
    syncExisting: args.includes('--sync-existing'),
    reportGaps: args.includes('--report-gaps'),
    reportGapsOut: outArg,
    locales: localesArg
      ? localesArg
          .split(',')
          .map((locale) => locale.trim())
          .filter(Boolean)
      : undefined,
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

  let adminEnJson = readJsonRecord(adminBundle.enJsonPath);

  if (options.reportGaps) {
    const report = buildGapReport(bundles, new Set(Object.keys(adminEnJson)), {
      locales: options.locales,
    });
    const json = `${JSON.stringify(report, null, 2)}\n`;

    if (options.reportGapsOut) {
      fs.writeFileSync(options.reportGapsOut, json);
      console.error(
        `report-gaps: wrote ${options.reportGapsOut} (${report.summary.keysWithGaps} keys with gaps, ${report.summary.missingOccurrences} missing key×locale)`
      );
    } else {
      process.stdout.write(json);
      console.error(
        `report-gaps: ${report.summary.keysWithGaps} keys with gaps, ${report.summary.missingOccurrences} missing key×locale across ${report.summary.bundleCount} bundle(s)`
      );
    }

    process.exit(0);
  }

  const allIssues: ValidationIssue[] = [];
  let fixedLocales = 0;
  let writtenEn = 0;

  if (options.writeEn) {
    const adminEnKeys = new Set(Object.keys(adminEnJson));

    for (const bundle of bundles) {
      const result = writeEnJsonForBundle(bundle, adminEnKeys, {
        syncExisting: options.syncExisting,
      });
      allIssues.push(...result.conflicts);

      if (result.changed) {
        writtenEn += 1;
        console.log(
          `Wrote ${bundle.packageName} en.json (+${result.addedKeys.length} / ~${result.updatedKeys.length})`
        );
      }
    }

    adminEnJson = readJsonRecord(adminBundle.enJsonPath);

    const alignedFiles = alignDefaultMessages(bundles, adminBundle);
    if (alignedFiles > 0) {
      console.log(`Aligned defaultMessage in ${alignedFiles} source file(s) to en.json.`);
    }

    if (writtenEn > 0) {
      console.log(`Synced ${writtenEn} en.json file(s) from defaultMessage.`);
    }
  }

  if (options.fix) {
    // Close remaining en.json gaps before pruning locales (no-op if --write-en already synced).
    const backfill = backfillMissingEnKeys(allBundles, adminBundle);

    if (backfill.addedKeys.length > 0) {
      console.log(
        `Backfilled ${backfill.addedKeys.length} missing key(s) into ${backfill.changedBundles} en.json file(s).`
      );
    }

    adminEnJson = readJsonRecord(adminBundle.enJsonPath);

    for (const bundle of bundles) {
      fixedLocales += fixLocaleFiles(bundle);
    }

    if (fixedLocales > 0) {
      console.log(`Fixed ${fixedLocales} locale file(s). Re-run without --fix to verify.`);
    }
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
