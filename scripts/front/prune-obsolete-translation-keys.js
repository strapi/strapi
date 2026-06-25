// Remove translation keys from locale files that no longer exist in en.json.
// Usage:
//   yarn translations:prune              # dry run (default)
//   yarn translations:prune --write      # apply changes
//   yarn translations:prune --verbose    # list every pruned key

'use strict';

const { join, dirname, relative } = require('path');
const fs = require('fs-extra');
const { glob } = require('glob');
const chalk = require('chalk');

const getObsoleteKeys = (baseTranslation, localeTranslation) => {
  const baseKeys = new Set(Object.keys(baseTranslation));

  return Object.keys(localeTranslation).filter((key) => !baseKeys.has(key));
};

const pruneObsoleteKeysFromJSON = (baseTranslation, localeTranslation) => {
  return Object.keys(baseTranslation).reduce((acc, key) => {
    if (key in localeTranslation) {
      acc[key] = localeTranslation[key];
    }

    return acc;
  }, {});
};

const getTranslationFilePaths = async () => {
  const corePackageDirs = await glob('packages/core/*');
  const pluginsPackageDirs = await glob('packages/plugins/*');
  const packageDirs = [...corePackageDirs, ...pluginsPackageDirs];
  const pathToTranslationsFolder = ['admin', 'src', 'translations'];

  return packageDirs
    .filter((dir) => fs.existsSync(join(dir, ...pathToTranslationsFolder, 'en.json')))
    .reduce((acc, dir) => {
      const translationsDir = join(dir, ...pathToTranslationsFolder);
      const files = fs
        .readdirSync(translationsDir)
        .filter((file) => file.endsWith('.json') && file !== 'en.json')
        .map((file) => join(translationsDir, file));

      return [...acc, ...files];
    }, []);
};

const pruneTranslationFile = async (filePath, { write = false } = {}) => {
  const baseTranslation = await fs.readJSON(join(dirname(filePath), 'en.json'));
  const localeTranslation = await fs.readJSON(filePath);
  const obsoleteKeys = getObsoleteKeys(baseTranslation, localeTranslation);

  if (obsoleteKeys.length === 0) {
    return { filePath, obsoleteKeys, changed: false };
  }

  if (write) {
    const prunedTranslation = pruneObsoleteKeysFromJSON(baseTranslation, localeTranslation);
    await fs.writeJson(filePath, prunedTranslation, { spaces: 2 });
  }

  return { filePath, obsoleteKeys, changed: true };
};

const pruneTranslations = async ({ write = false, verbose = false } = {}) => {
  const translationFiles = await getTranslationFilePaths();
  const results = await Promise.all(
    translationFiles.map((filePath) => pruneTranslationFile(filePath, { write }))
  );

  const changedResults = results.filter((result) => result.changed);
  const totalObsoleteKeys = changedResults.reduce(
    (acc, result) => acc + result.obsoleteKeys.length,
    0
  );

  if (changedResults.length === 0) {
    console.log(chalk.green('No obsolete translation keys found.'));
    return { filesChanged: 0, keysRemoved: 0, results: changedResults };
  }

  const modeLabel = write ? 'Removed' : 'Would remove';

  console.log(
    chalk.yellow(
      `${modeLabel} ${totalObsoleteKeys} obsolete key(s) from ${changedResults.length} translation file(s).`
    )
  );

  changedResults.forEach(({ filePath, obsoleteKeys }) => {
    const relativePath = relative(process.cwd(), filePath);
    console.log(`  ${relativePath} (${obsoleteKeys.length})`);

    if (verbose) {
      obsoleteKeys.forEach((key) => {
        console.log(`    - ${key}`);
      });
    }
  });

  if (!write) {
    console.log(chalk.dim('\nDry run only. Re-run with --write to apply changes.'));
  }

  return {
    filesChanged: changedResults.length,
    keysRemoved: totalObsoleteKeys,
    results: changedResults,
  };
};

if (require.main === module) {
  const write = process.argv.includes('--write');
  const verbose = process.argv.includes('--verbose');

  pruneTranslations({ write, verbose }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  getObsoleteKeys,
  pruneObsoleteKeysFromJSON,
  pruneTranslationFile,
  pruneTranslations,
};
