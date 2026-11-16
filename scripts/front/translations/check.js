// Verify admin translation keys in code exist in en.json and match defaultMessage.
// Usage:
//   yarn translations:check
//   yarn translations:check --verbose

'use strict';

const chalk = require('chalk');
const { getPackageConfigs } = require('./packages.config');
const { analyzePackage } = require('./analyze-package');

const formatUsageLocation = (usage) => `${usage.filePath}:${usage.line}`;

const printPackageIssues = (analysis, { verbose }) => {
  const { packageConfig, issues } = analysis;
  const errorCount =
    issues.missingFromEn.length +
    issues.valueMismatch.length +
    issues.conflictingDefaultMessages.length +
    issues.parseErrors.length;
  const warningCount = issues.dynamicIds.length + issues.missingDefaultMessage.length;

  if (errorCount === 0 && warningCount === 0) {
    console.log(chalk.green(`✓ ${packageConfig.pluginId}`));
    return { errors: 0, warnings: 0 };
  }

  console.log(
    chalk.yellow(`✗ ${packageConfig.pluginId} (${errorCount} error(s), ${warningCount} warning(s))`)
  );

  issues.missingFromEn.forEach(({ enKey, defaultMessage, usages }) => {
    console.log(chalk.red(`  missing from en.json: ${enKey}`));
    if (defaultMessage) {
      console.log(chalk.dim(`    defaultMessage: ${JSON.stringify(defaultMessage)}`));
    }
    if (verbose) {
      usages.forEach((usage) => console.log(chalk.dim(`    at ${formatUsageLocation(usage)}`)));
    }
  });

  issues.valueMismatch.forEach(({ enKey, expected, actual, usages }) => {
    console.log(chalk.red(`  value mismatch: ${enKey}`));
    console.log(chalk.dim(`    en.json: ${JSON.stringify(actual)}`));
    console.log(chalk.dim(`    code:    ${JSON.stringify(expected)}`));
    if (verbose) {
      usages.forEach((usage) => console.log(chalk.dim(`    at ${formatUsageLocation(usage)}`)));
    }
  });

  issues.conflictingDefaultMessages.forEach(({ enKey, defaultMessages, usages }) => {
    console.log(chalk.red(`  conflicting defaultMessage values: ${enKey}`));
    defaultMessages.forEach((defaultMessage) => {
      console.log(chalk.dim(`    - ${JSON.stringify(defaultMessage)}`));
    });
    if (verbose) {
      usages.forEach((usage) => console.log(chalk.dim(`    at ${formatUsageLocation(usage)}`)));
    }
  });

  issues.parseErrors.forEach(({ filePath, message }) => {
    console.log(chalk.red(`  parse error: ${filePath}`));
    console.log(chalk.dim(`    ${message}`));
  });

  issues.dynamicIds.forEach((usage) => {
    console.log(chalk.yellow(`  dynamic id (skipped): ${formatUsageLocation(usage)}`));
  });

  issues.missingDefaultMessage.forEach(({ enKey, usages }) => {
    console.log(chalk.yellow(`  no defaultMessage to verify: ${enKey}`));
    if (verbose) {
      usages.forEach((usage) => console.log(chalk.dim(`    at ${formatUsageLocation(usage)}`)));
    }
  });

  return { errors: errorCount, warnings: warningCount };
};

const runTranslationsCheck = ({ verbose = false } = {}) => {
  const packageConfigs = getPackageConfigs();
  let totalErrors = 0;
  let totalWarnings = 0;

  console.log(chalk.cyan('Checking translation keys against en.json...\n'));

  packageConfigs.forEach((packageConfig) => {
    const analysis = analyzePackage(packageConfig);
    const { errors, warnings } = printPackageIssues(analysis, { verbose });
    totalErrors += errors;
    totalWarnings += warnings;
  });

  console.log('');

  if (totalErrors === 0) {
    console.log(chalk.green(`All checked packages passed (${totalWarnings} warning(s)).`));
    return { success: true, errors: totalErrors, warnings: totalWarnings };
  }

  console.log(
    chalk.red(
      `Found ${totalErrors} error(s) and ${totalWarnings} warning(s). Run yarn translations:sync-en --write to fix missing/mismatched en.json keys where defaultMessage is present.`
    )
  );

  return { success: false, errors: totalErrors, warnings: totalWarnings };
};

if (require.main === module) {
  const verbose = process.argv.includes('--verbose');
  const result = runTranslationsCheck({ verbose });
  process.exit(result.success ? 0 : 1);
}

module.exports = {
  runTranslationsCheck,
};
