'use strict';

const { join } = require('path');
const { globSync } = require('glob');

const TRANSLATIONS_PATH = ['admin', 'src', 'translations', 'en.json'];
const SOURCE_PATH = ['admin', 'src'];

const getPackageDirs = () => {
  return globSync('packages/{core,plugins}/*').filter((packageDir) => {
    const enPath = join(packageDir, ...TRANSLATIONS_PATH);
    const srcPath = join(packageDir, ...SOURCE_PATH);

    return require('fs').existsSync(enPath) && require('fs').existsSync(srcPath);
  });
};

const getPackageConfig = (packageDir) => {
  const pluginId = packageDir.replace(/^packages\/(?:core|plugins)\//, '');
  const isAdminPackage = packageDir === 'packages/core/admin';

  return {
    packageDir,
    pluginId,
    prefix: isAdminPackage ? '' : `${pluginId}.`,
    translationHelpers: isAdminPackage ? [] : ['getTranslation', 'getTrad'],
    enJsonPath: join(packageDir, ...TRANSLATIONS_PATH),
    sourceDir: join(packageDir, ...SOURCE_PATH),
  };
};

const getPackageConfigs = () => getPackageDirs().map(getPackageConfig);

module.exports = {
  TRANSLATIONS_PATH,
  SOURCE_PATH,
  getPackageDirs,
  getPackageConfig,
  getPackageConfigs,
};
