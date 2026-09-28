import path from 'path';
import fse from 'fs-extra';

import type { Logger } from '../../../utils/logger';
import {
  enterprisePluginCatalog,
  findCatalogEntry,
  type EnterprisePluginCatalogEntry,
} from './catalog';
import { ENTERPRISE_SCOPE } from './constants';
import {
  fetchPackument,
  searchPackageNames,
  type Packument,
  type PackumentLookup,
} from './registry';
import {
  listNodeModulesDirectories,
  readInstalledPackageJson,
  readInstalledVersion,
} from './versions';

export interface DiscoveredPlugin {
  entry: EnterprisePluginCatalogEntry;
  lookup: PackumentLookup;
  installedVersion?: string;
}

const isEnterprisePackage = (packageName: string) => packageName.startsWith(`${ENTERPRISE_SCOPE}/`);

const toPluginId = (packageName: string) => packageName.slice(ENTERPRISE_SCOPE.length + 1);

const isPluginPackage = (packageName: string, strapiKind: string | undefined): boolean =>
  strapiKind === 'plugin' || findCatalogEntry(packageName) !== undefined;

/** Enterprise plugins installed in the app. Libraries the plugins depend on are left out. */
export const listInstalledEnterprisePlugins = async (appDir: string): Promise<string[]> => {
  const installedPluginNames = new Set<string>();

  for (const nodeModulesDirectory of listNodeModulesDirectories(appDir)) {
    const scopeDirectory = path.join(nodeModulesDirectory, ENTERPRISE_SCOPE);

    if (!(await fse.pathExists(scopeDirectory))) {
      continue;
    }

    for (const packageDirectoryName of await fse.readdir(scopeDirectory)) {
      const packageName = `${ENTERPRISE_SCOPE}/${packageDirectoryName}`;
      const packageJson = await readInstalledPackageJson(appDir, packageName);

      if (isPluginPackage(packageName, packageJson?.strapi?.kind)) {
        installedPluginNames.add(packageName);
      }
    }
  }

  return [...installedPluginNames];
};

const findLatestManifest = (packument: Packument) => {
  const latestVersion = packument['dist-tags']?.latest;

  return latestVersion ? packument.versions?.[latestVersion] : undefined;
};

/**
 * Describes a package for the checklist from its own `strapi` metadata, completed by what this CLI
 * knows about it. Returns undefined for a package that is not a plugin, such as a library the
 * plugins depend on.
 */
export const describeEnterprisePlugin = (
  packageName: string,
  lookup: PackumentLookup
): EnterprisePluginCatalogEntry | undefined => {
  const knownEntry = findCatalogEntry(packageName);

  if (lookup.status !== 'available') {
    return (
      knownEntry ?? {
        packageName,
        pluginId: toPluginId(packageName),
        displayName: packageName,
        summary: '',
      }
    );
  }

  const latestManifest = findLatestManifest(lookup.packument);
  const strapiMetadata = latestManifest?.strapi;

  if (!isPluginPackage(packageName, strapiMetadata?.kind)) {
    return undefined;
  }

  return {
    packageName,
    pluginId: strapiMetadata?.name ?? knownEntry?.pluginId ?? toPluginId(packageName),
    displayName: strapiMetadata?.displayName ?? knownEntry?.displayName ?? packageName,
    summary:
      strapiMetadata?.description ?? knownEntry?.summary ?? latestManifest?.description ?? '',
    configuration: knownEntry?.configuration,
  };
};

/**
 * Finds the Enterprise plugins to show: the ones the registry search returns for this license, the
 * ones this CLI knows, and the ones already installed. The known ones keep the list working while
 * the registry search is unavailable, and the installed ones reveal a plugin that the license no
 * longer includes.
 */
export const discoverEnterprisePlugins = async ({
  appDir,
  license,
  logger,
  env,
  fetchImplementation,
}: {
  appDir: string;
  license: string;
  logger: Logger;
  env: NodeJS.ProcessEnv;
  fetchImplementation: typeof fetch;
}): Promise<DiscoveredPlugin[]> => {
  const [searchedPackageNames, installedPluginNames] = await Promise.all([
    searchPackageNames({ text: ENTERPRISE_SCOPE, license, env, fetchImplementation }),
    listInstalledEnterprisePlugins(appDir),
  ]);

  if (searchedPackageNames === undefined) {
    logger.debug(
      'The registry search is unavailable, so only the known and installed Enterprise plugins are listed.'
    );
  }

  const candidatePackageNames = [
    ...new Set([
      ...(searchedPackageNames ?? []),
      ...enterprisePluginCatalog.map((entry) => entry.packageName),
      ...installedPluginNames,
    ]),
  ].filter(isEnterprisePackage);

  const discoveredPlugins = await Promise.all(
    candidatePackageNames.map(async (packageName): Promise<DiscoveredPlugin | undefined> => {
      const [lookup, installedVersion] = await Promise.all([
        fetchPackument({ packageName, license, env, fetchImplementation }),
        readInstalledVersion(appDir, packageName),
      ]);
      const entry = describeEnterprisePlugin(packageName, lookup);

      return entry ? { entry, lookup, installedVersion } : undefined;
    })
  );

  return discoveredPlugins.filter(
    (discoveredPlugin): discoveredPlugin is DiscoveredPlugin => discoveredPlugin !== undefined
  );
};
