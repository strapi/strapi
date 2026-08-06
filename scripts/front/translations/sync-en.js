// Add or update en.json keys from code defaultMessage values.
// Usage:
//   yarn translations:sync-en              # dry run (default)
//   yarn translations:sync-en --write      # apply changes
//   yarn translations:sync-en --verbose

'use strict';

const fs = require('fs');
const chalk = require('chalk');
const { getPackageConfigs } = require('./packages.config');
const { analyzePackage } = require('./analyze-package');

const sortTranslationKeys = (translations) => {
  return Object.keys(translations)
    .sort()
    .reduce((acc, key) => {
      acc[key] = translations[key];
      return acc;
    }, {});
};

const runTranslationsSyncEn = ({ write = false, verbose = false, packageConfigs = null } = {}) => {
  const configs = packageConfigs ?? getPackageConfigs();
  let totalAdds = 0;
  let totalUpdates = 0;

  console.log(
    chalk.cyan(
      write
        ? 'Syncing en.json files from code defaultMessage values...'
        : 'Dry run: would sync en.json files from code defaultMessage values...'
    )
  );
  console.log('');

  configs.forEach((packageConfig) => {
    const analysis = analyzePackage(packageConfig);
    const { issues } = analysis;

    if (issues.conflictingDefaultMessages.length > 0 || issues.parseErrors.length > 0) {
      console.log(chalk.red(`✗ ${packageConfig.pluginId} has blocking issues; skipped`));
      issues.conflictingDefaultMessages.forEach(({ enKey }) => {
        console.log(chalk.red(`  conflicting defaultMessage: ${enKey}`));
      });
      issues.parseErrors.forEach(({ filePath, message }) => {
        console.log(chalk.red(`  parse error: ${filePath} (${message})`));
      });
      return;
    }

    const nextTranslations = { ...analysis.enTranslations };
    let packageAdds = 0;
    let packageUpdates = 0;

    issues.missingFromEn.forEach(({ enKey, defaultMessage }) => {
      if (!defaultMessage) {
        return;
      }

      nextTranslations[enKey] = defaultMessage;
      packageAdds += 1;
      if (verbose) {
        console.log(chalk.green(`  add ${enKey}`));
      }
    });

    issues.valueMismatch.forEach(({ enKey, expected }) => {
      nextTranslations[enKey] = expected;
      packageUpdates += 1;
      if (verbose) {
        console.log(chalk.green(`  update ${enKey}`));
      }
    });

    if (packageAdds === 0 && packageUpdates === 0) {
      console.log(chalk.green(`✓ ${packageConfig.pluginId} (no changes)`));
      return;
    }

    const modeLabel = write ? 'Updated' : 'Would update';
    console.log(
      chalk.yellow(
        `${modeLabel} ${packageConfig.pluginId}: ${packageAdds} add(s), ${packageUpdates} update(s)`
      )
    );

    totalAdds += packageAdds;
    totalUpdates += packageUpdates;

    if (write) {
      fs.writeFileSync(
        packageConfig.enJsonPath,
        `${JSON.stringify(sortTranslationKeys(nextTranslations), null, 2)}\n`
      );
    }
  });

  console.log('');

  if (totalAdds === 0 && totalUpdates === 0) {
    console.log(chalk.green('No en.json changes needed.'));
  } else if (!write) {
    console.log(
      chalk.dim(
        `Would apply ${totalAdds} add(s) and ${totalUpdates} update(s). Re-run with --write to apply.`
      )
    );
  } else {
    console.log(chalk.green(`Applied ${totalAdds} add(s) and ${totalUpdates} update(s).`));
  }

  return { adds: totalAdds, updates: totalUpdates, write };
};

if (require.main === module) {
  const write = process.argv.includes('--write');
  const verbose = process.argv.includes('--verbose');

  runTranslationsSyncEn({ write, verbose });
}

module.exports = {
  runTranslationsSyncEn,
};
