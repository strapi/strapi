import type { Logger } from '../../../utils/logger';
import { ENTERPRISE_SCOPE } from './constants';
import { EnterpriseInstallError } from './errors';
import { isValidPackageName } from './package-name';
import { toPrintableText } from './printable-text';
import {
  fetchPackument,
  fetchPluginCatalog,
  searchPackageNames,
  type CatalogPlugin,
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
  listedOutsideLicense?: boolean;
}

interface DiscoveryResult {
  plugins: DiscoveredPlugin[];
  lockedPlugins: EnterprisePluginEntry[];
  notLicensedMessage?: string;
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
    displayName: toPrintableText(strapiMetadata.displayName) ?? packageName,
    summary:
      toPrintableText(strapiMetadata.description) ??
      toPrintableText(latestManifest?.description) ??
      '',
    kind: toPrintableText(strapiMetadata.kind),
  };
};

const describeCatalogPlugin = ({
  name,
  displayName,
  description,
  kind,
}: CatalogPlugin): EnterprisePluginEntry => ({
  packageName: name,
  displayName: displayName ?? name,
  summary: description ?? '',
  kind,
});

const searchCandidatePackageNames = async ({
  registryUrl,
  license,
  logger,
  fetchImplementation,
  installedPluginNames,
}: {
  registryUrl: string;
  license: string;
  logger: Logger;
  fetchImplementation: typeof fetch;
  installedPluginNames: string[];
}): Promise<string[]> => {
  const searchResult = await searchPackageNames({
    registryUrl,
    text: ENTERPRISE_SCOPE,
    license,
    fetchImplementation,
  });

  if (searchResult.status === 'license-rejected') {
    throw new EnterpriseInstallError(searchResult.message);
  }

  if (searchResult.status === 'unavailable') {
    const registryHost = new URL(registryUrl).host;

    if (installedPluginNames.length === 0) {
      throw new EnterpriseInstallError(
        `Could not search ${registryHost}. Try again later, or name the plugin to install.`
      );
    }

    logger.warn(
      `Could not search ${registryHost}, so only the installed Enterprise plugins are listed.`
    );

    return [];
  }

  return searchResult.packageNames;
};

const describeCandidatePlugins = async ({
  registryUrl,
  appDir,
  license,
  logger,
  fetchImplementation,
  packageNames,
}: {
  registryUrl: string;
  appDir: string;
  license: string;
  logger: Logger;
  fetchImplementation: typeof fetch;
  packageNames: string[];
}): Promise<DiscoveredPlugin[]> => {
  const candidatePackageNames = [...new Set(packageNames)].filter(isValidPackageName);

  const lookupFailures: string[] = [];

  const discoveredPlugins = await Promise.all(
    candidatePackageNames.map(async (packageName): Promise<DiscoveredPlugin | undefined> => {
      const [lookup, installedVersion] = await Promise.all([
        fetchPackument({ registryUrl, packageName, license, fetchImplementation }),
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

export const discoverEnterprisePlugins = async ({
  registryUrl,
  appDir,
  license,
  logger,
  fetchImplementation,
}: {
  registryUrl: string;
  appDir: string;
  license: string;
  logger: Logger;
  fetchImplementation: typeof fetch;
}): Promise<DiscoveryResult> => {
  const [catalogResult, installedPluginNames] = await Promise.all([
    fetchPluginCatalog({ registryUrl, license, fetchImplementation }),
    listInstalledEnterprisePlugins(appDir),
  ]);

  if (catalogResult.status === 'license-rejected') {
    throw new EnterpriseInstallError(catalogResult.message);
  }

  if (catalogResult.status === 'unavailable') {
    const searchedPackageNames = await searchCandidatePackageNames({
      registryUrl,
      license,
      logger,
      fetchImplementation,
      installedPluginNames,
    });

    return {
      plugins: await describeCandidatePlugins({
        registryUrl,
        appDir,
        license,
        logger,
        fetchImplementation,
        packageNames: [...searchedPackageNames, ...installedPluginNames],
      }),
      lockedPlugins: [],
    };
  }

  const enterpriseCatalogPlugins = catalogResult.plugins.filter(({ name }) =>
    isValidPackageName(name)
  );
  const licensedPackageNames = [
    ...new Set(enterpriseCatalogPlugins.filter(({ licensed }) => licensed).map(({ name }) => name)),
  ];
  const catalogPluginsOutsideLicense = enterpriseCatalogPlugins.filter(
    ({ name, licensed }) => !licensed && !licensedPackageNames.includes(name)
  );
  const lockedCatalogPlugins = new Map(
    catalogPluginsOutsideLicense
      .filter(({ name }) => !installedPluginNames.includes(name))
      .map((plugin) => [plugin.name, plugin])
  );
  const lockedPlugins = [...lockedCatalogPlugins.values()].map(describeCatalogPlugin);
  const describedPlugins = await describeCandidatePlugins({
    registryUrl,
    appDir,
    license,
    logger,
    fetchImplementation,
    packageNames: [...licensedPackageNames, ...installedPluginNames],
  });
  const plugins = describedPlugins.map((plugin) => ({
    ...plugin,
    listedOutsideLicense: catalogPluginsOutsideLicense.some(
      ({ name }) => name === plugin.entry.packageName
    ),
  }));

  return {
    plugins,
    lockedPlugins,
    notLicensedMessage:
      lockedPlugins.length > 0 || plugins.some(({ listedOutsideLicense }) => listedOutsideLicense)
        ? catalogResult.notLicensedMessage
        : undefined,
  };
};
