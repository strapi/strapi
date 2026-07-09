import fs from 'node:fs';
import path from 'node:path';

import { globSync } from 'glob';

import type { TranslationBundle } from './types';

const EN_JSON_GLOB = 'packages/{core/*,plugins/*}/admin/src/translations/en.json';

/** Plugin prefix per package path segment (after packages/). */
const PLUGIN_PREFIX_BY_PACKAGE: Record<string, string | null> = {
  'core/admin': null,
  'core/content-manager': 'content-manager',
  'core/content-releases': 'content-releases',
  'core/content-type-builder': 'content-type-builder',
  'core/email': 'email',
  'core/review-workflows': 'review-workflows',
  'core/upload': 'upload',
  'plugins/cloud': 'cloud',
  'plugins/color-picker': 'color-picker',
  'plugins/documentation': 'documentation',
  'plugins/graphql': 'graphql',
  'plugins/i18n': 'i18n',
  'plugins/sentry': 'sentry',
  'plugins/users-permissions': 'users-permissions',
};

const repoRoot = path.resolve(__dirname, '../../..');

const isExcludedSource = (filePath: string) =>
  /\/(__tests__|tests)\//.test(filePath) ||
  /\.(test|spec)\.[tj]sx?$/.test(filePath) ||
  filePath.includes('/node_modules/');

export const discoverBundles = (bundleFilter?: string): TranslationBundle[] => {
  const enPaths = globSync(EN_JSON_GLOB, { cwd: repoRoot, absolute: true });

  return enPaths
    .map((enJsonPath) => {
      const translationsDir = path.dirname(enJsonPath);
      const adminSrcDir = path.resolve(translationsDir, '..');
      const packagePath = path.resolve(adminSrcDir, '../..');
      const packageName = path
        .relative(path.join(repoRoot, 'packages'), packagePath)
        .split(path.sep)
        .join('/');

      const pluginPrefix = PLUGIN_PREFIX_BY_PACKAGE[packageName] ?? null;
      const sourceDirs = [adminSrcDir];
      const eeAdminDir = path.join(packagePath, 'ee/admin/src');

      if (fs.existsSync(eeAdminDir)) {
        sourceDirs.push(eeAdminDir);
      }

      return {
        packagePath,
        packageName,
        enJsonPath,
        translationsDir,
        pluginPrefix,
        sourceDirs,
      } satisfies TranslationBundle;
    })
    .filter((bundle) => {
      if (!bundleFilter) {
        return true;
      }

      return bundle.packageName === bundleFilter || bundle.packageName.endsWith(bundleFilter);
    })
    .sort((a, b) => a.packageName.localeCompare(b.packageName));
};

export const listSourceFiles = (bundle: TranslationBundle): string[] => {
  const files: string[] = [];

  for (const sourceDir of bundle.sourceDirs) {
    if (!fs.existsSync(sourceDir)) {
      continue;
    }

    files.push(
      ...globSync('**/*.{ts,tsx,js,jsx}', {
        cwd: sourceDir,
        absolute: true,
        ignore: ['**/node_modules/**'],
      }).filter((file) => !isExcludedSource(file))
    );
  }

  return files;
};

export const readJsonRecord = (filePath: string): Record<string, string> => {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, string>;
};

export const listLocaleFiles = (bundle: TranslationBundle): string[] => {
  return fs
    .readdirSync(bundle.translationsDir)
    .filter((file) => file.endsWith('.json') && file !== 'en.json')
    .map((file) => path.join(bundle.translationsDir, file));
};

export { repoRoot, PLUGIN_PREFIX_BY_PACKAGE };
