// Remove translation keys from locale files that no longer exist in en.json.
// Misplaced keys (present in another package's en.json) are moved there first.
// Usage:
//   yarn translations:prune              # dry run (default)
//   yarn translations:prune --write      # migrate misplaced keys, then prune
//   yarn translations:prune --verbose    # list every migrated/pruned key

'use strict';

const { join, dirname, relative, basename } = require('path');
const fs = require('fs-extra');
const { glob } = require('glob');
const chalk = require('chalk');

const TRANSLATIONS_PATH = ['admin', 'src', 'translations'];

const getPackageDirs = async () => {
  const corePackageDirs = await glob('packages/core/*');
  const pluginsPackageDirs = await glob('packages/plugins/*');

  return [...corePackageDirs, ...pluginsPackageDirs].filter((dir) =>
    fs.existsSync(join(dir, ...TRANSLATIONS_PATH, 'en.json'))
  );
};

const getPackageName = (packageDir) => packageDir.replace(/^packages\//, '');

const getLocaleFromFilePath = (filePath) => basename(filePath, '.json');

const getTranslationFilePaths = async (packageDirs = null) => {
  const dirs = packageDirs ?? (await getPackageDirs());

  return dirs.reduce((acc, packageDir) => {
    const translationsDir = join(packageDir, ...TRANSLATIONS_PATH);
    const files = fs
      .readdirSync(translationsDir)
      .filter((file) => file.endsWith('.json') && file !== 'en.json')
      .map((file) => join(translationsDir, file));

    return [...acc, ...files];
  }, []);
};

const buildEnKeyOwners = (packageDirs) => {
  const ownersByKey = new Map();

  packageDirs.forEach((packageDir) => {
    const packageName = getPackageName(packageDir);
    const enTranslation = fs.readJsonSync(join(packageDir, ...TRANSLATIONS_PATH, 'en.json'));

    Object.keys(enTranslation).forEach((key) => {
      if (!ownersByKey.has(key)) {
        ownersByKey.set(key, []);
      }

      ownersByKey.get(key).push({ packageDir, packageName });
    });
  });

  return ownersByKey;
};

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

const getMisplacedKeyActions = ({
  sourcePackageDir,
  localeTranslation,
  baseTranslation,
  ownersByKey,
}) => {
  const obsoleteKeys = getObsoleteKeys(baseTranslation, localeTranslation);

  return obsoleteKeys.map((key) => {
    const owners = ownersByKey.get(key) ?? [];
    const targetOwners = owners.filter((owner) => owner.packageDir !== sourcePackageDir);

    if (targetOwners.length === 1) {
      return {
        key,
        value: localeTranslation[key],
        type: 'migrate',
        targetPackageDir: targetOwners[0].packageDir,
        targetPackageName: targetOwners[0].packageName,
      };
    }

    if (targetOwners.length > 1) {
      return {
        key,
        type: 'ambiguous',
        targetPackageNames: targetOwners.map((owner) => owner.packageName),
      };
    }

    return { key, type: 'remove' };
  });
};

const migrateMisplacedKeys = async ({ write = false, verbose = false } = {}) => {
  const packageDirs = await getPackageDirs();
  const ownersByKey = buildEnKeyOwners(packageDirs);
  const translationFiles = await getTranslationFilePaths(packageDirs);

  const migrations = [];
  const skipped = [];
  const ambiguous = [];
  const targetWrites = new Map();

  translationFiles.forEach((filePath) => {
    const sourcePackageDir = packageDirs.find((packageDir) =>
      filePath.startsWith(join(packageDir, ...TRANSLATIONS_PATH))
    );
    const baseTranslation = fs.readJsonSync(join(dirname(filePath), 'en.json'));
    const localeTranslation = fs.readJsonSync(filePath);
    const locale = getLocaleFromFilePath(filePath);
    const actions = getMisplacedKeyActions({
      sourcePackageDir,
      localeTranslation,
      baseTranslation,
      ownersByKey,
    });

    actions.forEach((action) => {
      if (action.type === 'migrate') {
        const targetFilePath = join(
          action.targetPackageDir,
          ...TRANSLATIONS_PATH,
          `${locale}.json`
        );
        const targetExists = fs.existsSync(targetFilePath);
        const targetTranslation = targetExists ? fs.readJsonSync(targetFilePath) : {};

        if (action.key in targetTranslation) {
          skipped.push({
            key: action.key,
            sourceFilePath: filePath,
            targetFilePath,
            reason: 'already-present',
          });
          return;
        }

        if (!targetExists) {
          skipped.push({
            key: action.key,
            sourceFilePath: filePath,
            targetFilePath,
            reason: 'missing-target-locale',
          });
          return;
        }

        migrations.push({
          key: action.key,
          value: action.value,
          sourceFilePath: filePath,
          targetFilePath,
          targetPackageName: action.targetPackageName,
        });

        if (!targetWrites.has(targetFilePath)) {
          targetWrites.set(targetFilePath, { ...targetTranslation });
        }

        targetWrites.get(targetFilePath)[action.key] = action.value;
      } else if (action.type === 'ambiguous') {
        ambiguous.push({
          key: action.key,
          sourceFilePath: filePath,
          targetPackageNames: action.targetPackageNames,
        });
      }
    });
  });

  if (write) {
    await Promise.all(
      [...targetWrites.entries()].map(([targetFilePath, targetTranslation]) =>
        fs.writeJson(targetFilePath, targetTranslation, { spaces: 2 })
      )
    );
  }

  return { migrations, skipped, ambiguous, write };
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

const groupByFile = (items, filePathKey) => {
  return items.reduce((acc, item) => {
    const filePath = item[filePathKey];
    if (!acc.has(filePath)) {
      acc.set(filePath, []);
    }
    acc.get(filePath).push(item);
    return acc;
  }, new Map());
};

const logFileGroupedActions = (items, filePathKey, keyField, { verbose, formatItem }) => {
  const grouped = groupByFile(items, filePathKey);

  grouped.forEach((groupItems, filePath) => {
    console.log(`  ${relative(process.cwd(), filePath)} (${groupItems.length})`);

    if (verbose) {
      groupItems.forEach((item) => {
        console.log(`    - ${formatItem(item)}`);
      });
    }
  });
};

const pruneTranslations = async ({ write = false, verbose = false } = {}) => {
  const migrationSummary = await migrateMisplacedKeys({ write, verbose });
  const { migrations, skipped, ambiguous } = migrationSummary;

  if (migrations.length > 0) {
    const modeLabel = write ? 'Migrated' : 'Would migrate';
    console.log(
      chalk.cyan(
        `${modeLabel} ${migrations.length} misplaced key(s) to their owning package locale file(s).`
      )
    );
    logFileGroupedActions(migrations, 'sourceFilePath', 'key', {
      verbose,
      formatItem: (item) => `${item.key} -> ${item.targetPackageName}`,
    });
  }

  if (skipped.length > 0) {
    console.log(
      chalk.dim(
        `Skipped ${skipped.length} misplaced key(s) (already present or no target locale file).`
      )
    );

    if (verbose) {
      skipped.forEach((item) => {
        console.log(
          chalk.dim(
            `  - ${item.key} (${item.reason}) ${relative(process.cwd(), item.sourceFilePath)} -> ${relative(process.cwd(), item.targetFilePath)}`
          )
        );
      });
    }
  }

  if (ambiguous.length > 0) {
    console.log(
      chalk.red(`Found ${ambiguous.length} ambiguous misplaced key(s) shared by multiple packages.`)
    );

    if (verbose) {
      ambiguous.forEach((item) => {
        console.log(
          chalk.red(
            `  - ${item.key} in ${relative(process.cwd(), item.sourceFilePath)} (${item.targetPackageNames.join(', ')})`
          )
        );
      });
    }
  }

  const translationFiles = await getTranslationFilePaths();
  const results = await Promise.all(
    translationFiles.map((filePath) => pruneTranslationFile(filePath, { write }))
  );

  const changedResults = results.filter((result) => result.changed);
  const totalObsoleteKeys = changedResults.reduce(
    (acc, result) => acc + result.obsoleteKeys.length,
    0
  );

  if (changedResults.length === 0 && migrations.length === 0) {
    console.log(chalk.green('No obsolete or misplaced translation keys found.'));
    return {
      filesChanged: 0,
      keysRemoved: 0,
      keysMigrated: 0,
      results: changedResults,
      migrations,
      skipped,
      ambiguous,
    };
  }

  if (changedResults.length > 0) {
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
  }

  if (!write) {
    console.log(chalk.dim('\nDry run only. Re-run with --write to apply changes.'));
  }

  return {
    filesChanged: changedResults.length,
    keysRemoved: totalObsoleteKeys,
    keysMigrated: migrations.length,
    results: changedResults,
    migrations,
    skipped,
    ambiguous,
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
  getMisplacedKeyActions,
  migrateMisplacedKeys,
  pruneTranslationFile,
  pruneTranslations,
};
