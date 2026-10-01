import path from 'path';
import fse from 'fs-extra';

import type { Logger } from '../../../utils/logger';
import { ENTERPRISE_SCOPE } from './constants';
import { EnterpriseInstallError } from './errors';
import {
  fetchPackument,
  getRegistryUrl,
  searchPackageNames,
  type Packument,
  type PackumentLookup,
} from './registry';
import {
  listNodeModulesDirectories,
  readInstalledPackageJson,
  readInstalledVersion,
} from './versions';

export interface EnterprisePluginEntry {
  packageName: string;
  pluginId: string;
  displayName: string;
  summary: string;
  kind?: string;
}

export interface DiscoveredPlugin {
  entry: EnterprisePluginEntry;
  lookup: PackumentLookup;
  installedVersion?: string;
}

const isEnterprisePackage = (packageName: string) => packageName.startsWith(`${ENTERPRISE_SCOPE}/`);

const toPluginId = (packageName: string) => packageName.slice(ENTERPRISE_SCOPE.length + 1);

export const declaresStrapiKind = (strapiKind: unknown): strapiKind is string =>
  typeof strapiKind === 'string' && strapiKind.length > 0;

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

      if (declaresStrapiKind(packageJson?.strapi?.kind)) {
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

export const describeEnterprisePlugin = (
  packageName: string,
  lookup: PackumentLookup
): EnterprisePluginEntry | undefined => {
  if (lookup.status !== 'available') {
    return {
      packageName,
      pluginId: toPluginId(packageName),
      displayName: packageName,
      summary: '',
    };
  }

  const latestManifest = findLatestManifest(lookup.packument);
  const strapiMetadata = latestManifest?.strapi;

  if (!strapiMetadata || !declaresStrapiKind(strapiMetadata.kind)) {
    return undefined;
  }

  return {
    packageName,
    pluginId: strapiMetadata.name ?? toPluginId(packageName),
    displayName: strapiMetadata.displayName ?? packageName,
    summary: strapiMetadata.description ?? latestManifest?.description ?? '',
    kind: strapiMetadata.kind,
  };
};

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
    const registryHost = new URL(getRegistryUrl(env)).host;

    if (installedPluginNames.length === 0) {
      throw new EnterpriseInstallError(
        `Could not search ${registryHost}. Try again later, or name the plugin to install.`
      );
    }

    logger.warn(
      `Could not search ${registryHost}, so only the installed Enterprise plugins are listed.`
    );
  }

  const candidatePackageNames = [
    ...new Set([...(searchedPackageNames ?? []), ...installedPluginNames]),
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
