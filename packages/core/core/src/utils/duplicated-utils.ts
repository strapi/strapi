import fs from 'fs';
import path from 'path';
import type { Core } from '@strapi/types';

type ResolveUtils = (fromDir: string) => string | undefined;

interface UtilsCopy {
  name: string;
  version?: string;
  utilsPath: string;
  utilsVersion?: string;
}

const resolvePackageJSON = (name: string, fromDir: string) => {
  try {
    return require.resolve(`${name}/package.json`, { paths: [fromDir] });
  } catch {
    // e.g. packages whose `exports` don't expose their package.json
    return undefined;
  }
};

const resolveCoreUtils = () => {
  try {
    return require.resolve('@strapi/utils/package.json');
  } catch {
    return undefined;
  }
};

interface PackageJSON {
  version?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const readPackageJSON = (packageJSONPath: string): PackageJSON | undefined => {
  try {
    return JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'));
  } catch {
    return undefined;
  }
};

const usesUtils = (pkg: PackageJSON | undefined) =>
  Boolean(pkg?.dependencies?.['@strapi/utils'] ?? pkg?.peerDependencies?.['@strapi/utils']);

/**
 * Lists the app dependencies that load another copy of `@strapi/utils` than the one core uses.
 * Errors thrown from that copy fail core's `instanceof` checks: a plugin's `ForbiddenError`
 * ends up as a 500 instead of a 403.
 */
const findDuplicatedUtils = (
  appRoot: string,
  dependencies: Record<string, string> = {},
  coreUtilsPath: string | null | undefined = resolveCoreUtils(),
  resolveUtils: ResolveUtils = (fromDir) => resolvePackageJSON('@strapi/utils', fromDir)
): UtilsCopy[] => {
  if (!coreUtilsPath) {
    return [];
  }

  return Object.keys(dependencies).flatMap((name) => {
    const packageJSONPath = resolvePackageJSON(name, appRoot);

    const pkg = packageJSONPath ? readPackageJSON(packageJSONPath) : undefined;

    if (!packageJSONPath || !usesUtils(pkg)) {
      return [];
    }

    const utilsPath = resolveUtils(path.dirname(packageJSONPath));

    if (!utilsPath || utilsPath === coreUtilsPath) {
      return [];
    }

    return [
      {
        name,
        version: pkg?.version,
        utilsPath,
        utilsVersion: readPackageJSON(utilsPath)?.version,
      },
    ];
  });
};

const warnOnDuplicatedUtils = (strapi: Core.Strapi) => {
  const copies = findDuplicatedUtils(strapi.dirs.app.root, strapi.config.get('info.dependencies'));

  if (copies.length === 0) {
    return;
  }

  strapi.log.warn(
    [
      'Some dependencies load another copy of @strapi/utils than @strapi/core:',
      ...copies.map(
        ({ name, version, utilsVersion }) =>
          `  - ${name}${version ? `@${version}` : ''} uses @strapi/utils${utilsVersion ? `@${utilsVersion}` : ''}`
      ),
      'Several copies of @strapi/utils can make errors and other checks behave unexpectedly.',
      'Use the same version for all @strapi/* packages, for example with `npx @strapi/upgrade`, then reinstall.',
    ].join('\n')
  );
};

export { findDuplicatedUtils, warnOnDuplicatedUtils };
