import type { Logger } from '../../../utils/logger';
import { ENTERPRISE_REGISTRY_URL, ENTERPRISE_SCOPE } from './constants';
import { EnterpriseInstallError } from './errors';
import {
  fetchPackument,
  searchPackageNames,
  type Packument,
  type PackumentLookup,
} from './registry';
import {
  readAppDependencyNames,
  readAppDependencyVersion,
  readInstalledPackageJson,
} from './versions';

export interface EnterprisePluginEntry {
  packageName: string;
  displayName: string;
  summary: string;
  kind?: string;
}

export interface DiscoveredPlugin {
  entry: EnterprisePluginEntry;
  lookup: Exclude<PackumentLookup, { status: 'unavailable' }>;
  installedVersion?: string;
}

const isEnterprisePackage = (packageName: string) => packageName.startsWith(`${ENTERPRISE_SCOPE}/`);

export const declaresStrapiKind = (strapiKind: unknown): strapiKind is string =>
  typeof strapiKind === 'string' && strapiKind.length > 0;

/**
 * Enterprise plugins the app depends on: listed in its own `package.json`, and installed. Libraries
 * the plugins depend on are left out, as are copies hoisted for another app of the same monorepo.
 */
export const listInstalledEnterprisePlugins = async (appDir: string): Promise<string[]> => {
  const installedPluginNames: string[] = [];

  for (const packageName of await readAppDependencyNames(appDir)) {
    if (!isEnterprisePackage(packageName)) {
      continue;
    }

    const packageJson = await readInstalledPackageJson(appDir, packageName);

    if (declaresStrapiKind(packageJson?.strapi?.kind)) {
      installedPluginNames.push(packageName);
    }
  }

  return installedPluginNames;
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
    displayName: strapiMetadata.displayName ?? packageName,
    summary: strapiMetadata.description ?? latestManifest?.description ?? '',
    kind: strapiMetadata.kind,
  };
};

export const discoverEnterprisePlugins = async ({
  appDir,
  license,
  logger,
  fetchImplementation,
}: {
  appDir: string;
  license: string;
  logger: Logger;
  fetchImplementation: typeof fetch;
}): Promise<DiscoveredPlugin[]> => {
  const [searchResult, installedPluginNames] = await Promise.all([
    searchPackageNames({ text: ENTERPRISE_SCOPE, license, fetchImplementation }),
    listInstalledEnterprisePlugins(appDir),
  ]);

  if (searchResult.status === 'license-rejected') {
    throw new EnterpriseInstallError(searchResult.message);
  }

  if (searchResult.status === 'unavailable') {
    const registryHost = new URL(ENTERPRISE_REGISTRY_URL).host;

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
    ...new Set([
      ...(searchResult.status === 'available' ? searchResult.packageNames : []),
      ...installedPluginNames,
    ]),
  ].filter(isEnterprisePackage);

  const lookupFailures: string[] = [];

  const discoveredPlugins = await Promise.all(
    candidatePackageNames.map(async (packageName): Promise<DiscoveredPlugin | undefined> => {
      const [lookup, installedVersion] = await Promise.all([
        fetchPackument({ packageName, license, fetchImplementation }),
        readAppDependencyVersion(appDir, packageName),
      ]);

      if (lookup.status === 'unavailable') {
        // One package the registry fails to describe should not hide the others.
        lookupFailures.push(lookup.message);
        logger.warn(`${packageName} is left out of the list: ${lookup.message}`);

        return undefined;
      }

      const entry = describeEnterprisePlugin(packageName, lookup);

      return entry ? { entry, lookup, installedVersion } : undefined;
    })
  );

  // When every lookup fails, the registry itself is the problem, not the license.
  if (candidatePackageNames.length > 0 && lookupFailures.length === candidatePackageNames.length) {
    throw new EnterpriseInstallError(lookupFailures[0]);
  }

  return discoveredPlugins.filter(
    (discoveredPlugin): discoveredPlugin is DiscoveredPlugin => discoveredPlugin !== undefined
  );
};
