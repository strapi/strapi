// Remove translation keys from locale files that no longer exist in en.json
// and are not referenced by that package's source.
// Misplaced keys (present in exactly one other package's en.json) are moved there first.
// Keys still referenced in source are kept even when en.json does not list them.
// Keys owned by multiple packages are kept rather than dropped.
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

const getPluginPrefix = (packageDir) => {
  const packageName = getPackageName(packageDir);

  if (packageName === 'core/admin') {
    return null;
  }

  const segment = packageName.split('/').pop();

  return segment && segment.length > 0 ? segment : null;
};

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);

const listSourceFiles = (packageDir) => {
  const files = [];

  const walk = (dir) => {
    if (!fs.existsSync(dir)) {
      return;
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const filePath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === 'tests') {
          continue;
        }

        walk(filePath);
        continue;
      }

      const extension = entry.name.slice(entry.name.lastIndexOf('.'));

      if (!SOURCE_EXTENSIONS.has(extension) || /\.(test|spec)\.[jt]sx?$/.test(entry.name)) {
        continue;
      }

      files.push(filePath);
    }
  };

  walk(join(packageDir, 'admin', 'src'));
  walk(join(packageDir, 'ee', 'admin', 'src'));

  return files;
};

const recordReferencedKey = (keys, raw, prefix, fromHelper) => {
  if (!raw) {
    return;
  }

  if (fromHelper || !prefix) {
    keys.add(raw);

    if (prefix && raw.startsWith(`${prefix}.`)) {
      keys.add(raw.slice(prefix.length + 1));
    }

    return;
  }

  const prefixWithDot = `${prefix}.`;

  if (raw.startsWith(prefixWithDot)) {
    keys.add(raw.slice(prefixWithDot.length));
    keys.add(raw);
  }
};

const HELPER_KEY_PATTERN =
  /(?:getTrad|getTranslation|getTranslationKey)\(\s*(['"`])([^'"`$\n]+)\1/g;
const MESSAGE_ID_PATTERN = /\bid\s*:\s*(['"`])([^'"`$\n]+)\1/g;

const collectReferencedKeys = (packageDir) => {
  const prefix = getPluginPrefix(packageDir);
  const keys = new Set();

  listSourceFiles(packageDir).forEach((filePath) => {
    const text = fs.readFileSync(filePath, 'utf8');

    HELPER_KEY_PATTERN.lastIndex = 0;
    MESSAGE_ID_PATTERN.lastIndex = 0;

    for (const match of text.matchAll(HELPER_KEY_PATTERN)) {
      recordReferencedKey(keys, match[2], prefix, true);
    }

    for (const match of text.matchAll(MESSAGE_ID_PATTERN)) {
      recordReferencedKey(keys, match[2], prefix, false);
    }
  });

  return keys;
};

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

const getObsoleteKeys = (baseTranslation, localeTranslation, preservedKeys = new Set()) => {
  const baseKeys = new Set(Object.keys(baseTranslation));

  return Object.keys(localeTranslation).filter(
    (key) => !baseKeys.has(key) && !preservedKeys.has(key)
  );
};

const pruneObsoleteKeysFromJSON = (
  baseTranslation,
  localeTranslation,
  preservedKeys = new Set()
) => {
  const pruned = Object.keys(baseTranslation).reduce((acc, key) => {
    if (key in localeTranslation) {
      acc[key] = localeTranslation[key];
    }

    return acc;
  }, {});

  Object.keys(localeTranslation).forEach((key) => {
    if (!(key in pruned) && preservedKeys.has(key)) {
      pruned[key] = localeTranslation[key];
    }
  });

  return pruned;
};

const getAmbiguousKeys = ({
  sourcePackageDir,
  localeTranslation,
  baseTranslation,
  ownersByKey,
}) => {
  const ambiguous = new Set();

  Object.keys(localeTranslation).forEach((key) => {
    if (key in baseTranslation) {
      return;
    }

    const owners = (ownersByKey.get(key) ?? []).filter(
      (owner) => owner.packageDir !== sourcePackageDir
    );

    if (owners.length > 1) {
      ambiguous.add(key);
    }
  });

  return ambiguous;
};

const getPreservedKeys = ({
  sourcePackageDir,
  localeTranslation,
  baseTranslation,
  ownersByKey,
  referencedKeys = new Set(),
}) => {
  const preserved = new Set(referencedKeys);

  getAmbiguousKeys({
    sourcePackageDir,
    localeTranslation,
    baseTranslation,
    ownersByKey,
  }).forEach((key) => {
    preserved.add(key);
  });

  return preserved;
};

const getMisplacedKeyActions = ({
  sourcePackageDir,
  localeTranslation,
  baseTranslation,
  ownersByKey,
  referencedKeys = new Set(),
}) => {
  const obsoleteKeys = getObsoleteKeys(baseTranslation, localeTranslation, referencedKeys);

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

const migrateMisplacedKeys = async ({
  write = false,
  verbose = false,
  packageDirs: packageDirsArg = null,
  ownersByKey: ownersByKeyArg = null,
  referencedKeysByPackage = new Map(),
} = {}) => {
  const packageDirs = packageDirsArg ?? (await getPackageDirs());
  const ownersByKey = ownersByKeyArg ?? buildEnKeyOwners(packageDirs);
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
      referencedKeys: referencedKeysByPackage.get(sourcePackageDir) ?? new Set(),
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

const pruneTranslationFile = async (
  filePath,
  { write = false, referencedKeys = new Set(), ownersByKey = new Map(), sourcePackageDir } = {}
) => {
  const baseTranslation = await fs.readJSON(join(dirname(filePath), 'en.json'));
  const localeTranslation = await fs.readJSON(filePath);
  const preservedKeys = getPreservedKeys({
    sourcePackageDir,
    localeTranslation,
    baseTranslation,
    ownersByKey,
    referencedKeys,
  });
  const obsoleteKeys = getObsoleteKeys(baseTranslation, localeTranslation, preservedKeys);

  if (obsoleteKeys.length === 0) {
    return { filePath, obsoleteKeys, changed: false };
  }

  if (write) {
    const prunedTranslation = pruneObsoleteKeysFromJSON(
      baseTranslation,
      localeTranslation,
      preservedKeys
    );
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
  const packageDirs = await getPackageDirs();
  const ownersByKey = buildEnKeyOwners(packageDirs);
  const referencedKeysByPackage = new Map(
    packageDirs.map((packageDir) => [packageDir, collectReferencedKeys(packageDir)])
  );
  const migrationSummary = await migrateMisplacedKeys({
    write,
    verbose,
    packageDirs,
    ownersByKey,
    referencedKeysByPackage,
  });
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

  const translationFiles = await getTranslationFilePaths(packageDirs);
  const results = await Promise.all(
    translationFiles.map((filePath) => {
      const sourcePackageDir = packageDirs.find((packageDir) =>
        filePath.startsWith(join(packageDir, ...TRANSLATIONS_PATH))
      );

      return pruneTranslationFile(filePath, {
        write,
        referencedKeys: referencedKeysByPackage.get(sourcePackageDir) ?? new Set(),
        ownersByKey,
        sourcePackageDir,
      });
    })
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
  getAmbiguousKeys,
  getPreservedKeys,
  getMisplacedKeyActions,
  collectReferencedKeys,
  migrateMisplacedKeys,
  pruneTranslationFile,
  pruneTranslations,
};
