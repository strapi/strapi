import os from 'os';

import { loadEnv } from '../../../../node/core/env';
import type { Logger } from '../../../utils/logger';
import { findCatalogEntry } from './catalog';
import { printConfigurationHints } from './configuration-hints';
import { BILLING_URL, ENTERPRISE_SCOPE, STRAPI_PACKAGE_NAME } from './constants';
import { discoverEnterprisePlugins } from './discovery';
import { EnterpriseInstallError } from './errors';
import { buildInstallCommand, installPackages } from './install-packages';
import { resolveLicense } from './license';
import { detectPackageManager } from './package-manager';
import { configureRegistryAccess } from './registry-access';
import { fetchPackument, getRegistryUrl, type PackumentLookup } from './registry';
import { buildPluginRow, isSelectable, orderVisibleRows, promptForPlugins } from './selection';
import {
  canCheckStrapiCompatibility,
  describeNewerIncompatibleVersion,
  isPrerelease,
  isUpgrade,
  pickTargetVersion,
  readInstalledVersion,
  resolveRequestedVersion,
} from './versions';

export interface InstallDependencies {
  isInteractive: boolean;
  env: NodeJS.ProcessEnv;
  homeDir: string;
  now: Date;
  fetchImplementation: typeof fetch;
  promptForLicense?: () => Promise<string>;
  promptForPlugins: typeof promptForPlugins;
  installPackages: typeof installPackages;
}

const describeNoStableRelease = (packageName: string) =>
  `${packageName} has no stable release yet. To install a prerelease, name its version: ${packageName}@<version>.`;

const describeStrapiMismatch = (
  packageName: string,
  requiredStrapiRange: string | undefined,
  strapiVersion: string | undefined
) =>
  `${packageName} requires Strapi ${requiredStrapiRange} and this app uses ${strapiVersion}. Upgrade Strapi first.`;

interface InstallContext {
  appDir: string;
  license: string;
  strapiVersion?: string;
  logger: Logger;
  dependencies: InstallDependencies;
}

export const parsePackageArgument = (
  packageArgument: string
): { packageName: string; requestedVersion?: string } => {
  const scopedArgument = packageArgument.startsWith('@')
    ? packageArgument
    : `${ENTERPRISE_SCOPE}/${packageArgument}`;
  const versionSeparatorIndex = scopedArgument.indexOf('@', 1);
  const packageName =
    versionSeparatorIndex === -1 ? scopedArgument : scopedArgument.slice(0, versionSeparatorIndex);
  const requestedVersion =
    versionSeparatorIndex === -1 ? undefined : scopedArgument.slice(versionSeparatorIndex + 1);

  if (!packageName.startsWith(`${ENTERPRISE_SCOPE}/`)) {
    throw new EnterpriseInstallError(
      `${packageArgument} is not an Enterprise package. Enterprise packages start with ${ENTERPRISE_SCOPE}/.`
    );
  }

  return { packageName, requestedVersion: requestedVersion || undefined };
};

function assertLicenseAccepted(
  lookup: PackumentLookup,
  env: NodeJS.ProcessEnv
): asserts lookup is Exclude<PackumentLookup, { status: 'license-rejected' }> {
  if (lookup.status === 'license-rejected') {
    throw new EnterpriseInstallError(
      `${getRegistryUrl(env)} rejected this Strapi license. Check it at ${BILLING_URL}`
    );
  }
}

const resolveNamedPackages = async (
  packageArguments: string[],
  { appDir, license, strapiVersion, logger, dependencies }: InstallContext
): Promise<string[]> => {
  const installSpecs: string[] = [];

  for (const packageArgument of packageArguments) {
    const { packageName, requestedVersion } = parsePackageArgument(packageArgument);
    const lookup = await fetchPackument({
      packageName,
      license,
      env: dependencies.env,
      fetchImplementation: dependencies.fetchImplementation,
    });

    assertLicenseAccepted(lookup, dependencies.env);

    if (lookup.status === 'not-licensed') {
      throw new EnterpriseInstallError(
        `Your license does not include ${packageName}, or it does not exist. Run strapi enterprise install without a name to see the plugins you can install.`
      );
    }

    if (lookup.status === 'not-found') {
      throw new EnterpriseInstallError(`${packageName} is not an Enterprise package.`);
    }

    if (requestedVersion) {
      const resolvedVersion = resolveRequestedVersion(lookup.packument, requestedVersion);

      if (
        resolvedVersion &&
        resolvedVersion === (await readInstalledVersion(appDir, packageName))
      ) {
        logger.info(`${packageName} ${resolvedVersion} is already installed.`);
        continue;
      }

      installSpecs.push(`${packageName}@${requestedVersion}`);
      continue;
    }

    const versionChoice = pickTargetVersion(lookup.packument, strapiVersion);
    const { targetVersion } = versionChoice;

    if (!targetVersion) {
      if (!versionChoice.newestVersion) {
        throw new EnterpriseInstallError(describeNoStableRelease(packageName));
      }

      throw new EnterpriseInstallError(
        describeStrapiMismatch(packageName, versionChoice.newestVersionStrapiRange, strapiVersion)
      );
    }

    const newerVersionHint = describeNewerIncompatibleVersion(versionChoice);
    if (newerVersionHint) {
      logger.info(`${packageName}: ${newerVersionHint}`);
    }

    const installedVersion = await readInstalledVersion(appDir, packageName);
    if (installedVersion && !isUpgrade(installedVersion, targetVersion)) {
      logger.info(`${packageName} ${installedVersion} is already installed and up to date.`);
      continue;
    }

    if (installedVersion && isPrerelease(installedVersion)) {
      logger.info(
        `${packageName}: replacing the installed prerelease ${installedVersion} with the stable release ${targetVersion}.`
      );
    }

    installSpecs.push(`${packageName}@${targetVersion}`);
  }

  return installSpecs;
};

const selectPlugins = async ({
  appDir,
  license,
  strapiVersion,
  logger,
  dependencies,
}: InstallContext): Promise<string[]> => {
  const discoveredPlugins = await discoverEnterprisePlugins({
    appDir,
    license,
    logger,
    env: dependencies.env,
    fetchImplementation: dependencies.fetchImplementation,
  });

  const lookedUpRows = discoveredPlugins.map(({ entry, lookup, installedVersion }) => ({
    lookup,
    row: buildPluginRow({ entry, lookup, installedVersion, strapiVersion }),
  }));

  lookedUpRows.forEach(({ lookup }) => assertLicenseAccepted(lookup, dependencies.env));

  const isAnyPluginLicensed = lookedUpRows.some(({ lookup }) => lookup.status === 'available');
  const rows = lookedUpRows.map(({ row }) => row);

  rows
    .filter((row) => row.state === 'not-licensed')
    .forEach((row) =>
      logger.warn(`${row.entry.packageName} is installed but is not included in your license.`)
    );

  if (!isAnyPluginLicensed && !rows.some((row) => row.state === 'not-licensed')) {
    throw new EnterpriseInstallError('Your license does not include any Enterprise plugins.');
  }

  if (!rows.some(isSelectable)) {
    const visibleRows = orderVisibleRows(rows);

    // Says why each plugin cannot be installed, rather than calling them all up to date.
    visibleRows.forEach((row) => {
      const { packageName } = row.entry;

      if (row.state === 'installed' && row.note) {
        logger.info(`${packageName}: ${row.note}`);
      } else if (row.state === 'no-stable-release') {
        logger.info(describeNoStableRelease(packageName));
      } else if (row.state === 'no-compatible-version') {
        logger.info(describeStrapiMismatch(packageName, row.requiredStrapiRange, strapiVersion));
      }
    });

    if (visibleRows.every((row) => row.state === 'installed' || row.state === 'not-licensed')) {
      logger.info('The Enterprise plugins in your license are installed and up to date.');
    }

    return [];
  }

  return dependencies.promptForPlugins(rows);
};

const warnWhenCompatibilityIsUnknown = (strapiVersion: string | undefined, logger: Logger) => {
  if (strapiVersion === undefined) {
    logger.warn(
      `Could not find ${STRAPI_PACKAGE_NAME} in node_modules, so plugin compatibility is not checked. Install the app's dependencies first.`
    );
  } else if (!canCheckStrapiCompatibility(strapiVersion)) {
    logger.warn(
      `This app uses Strapi ${strapiVersion}, a prerelease, so plugin compatibility is not checked.`
    );
  }
};

export const runInstall = async ({
  appDir,
  packageArguments,
  logger,
  dependencies,
}: {
  appDir: string;
  packageArguments: string[];
  logger: Logger;
  dependencies: InstallDependencies;
}): Promise<void> => {
  if (packageArguments.length === 0 && !dependencies.isInteractive) {
    throw new EnterpriseInstallError(
      'Pass package names, or run the command in an interactive terminal.'
    );
  }

  const { license, source: licenseSource } = await resolveLicense({
    appDir,
    isInteractive: dependencies.isInteractive,
    logger,
    env: dependencies.env,
    now: dependencies.now,
    prompt: dependencies.promptForLicense,
  });

  const packageManager = await detectPackageManager(appDir);

  await configureRegistryAccess({
    appDir,
    packageManager,
    license,
    licenseSource,
    logger,
    env: dependencies.env,
    homeDir: dependencies.homeDir,
  });

  const strapiVersion = await readInstalledVersion(appDir, STRAPI_PACKAGE_NAME);
  warnWhenCompatibilityIsUnknown(strapiVersion, logger);

  const context: InstallContext = { appDir, license, strapiVersion, logger, dependencies };
  const installSpecs =
    packageArguments.length > 0
      ? await resolveNamedPackages(packageArguments, context)
      : await selectPlugins(context);

  if (installSpecs.length === 0) {
    logger.info('Nothing to install.');
    return;
  }

  const { command, args } = buildInstallCommand(packageManager, installSpecs);
  logger.info(`Running ${command} ${args.join(' ')}`);

  await dependencies.installPackages({ appDir, packageManager, installSpecs });

  const installedEntries = installSpecs
    .map((installSpec) => findCatalogEntry(parsePackageArgument(installSpec).packageName))
    .filter((entry) => entry !== undefined);

  await printConfigurationHints({ appDir, entries: installedEntries, logger });
};

const hasExitCode = (error: unknown): error is { exitCode: number } =>
  typeof error === 'object' &&
  error !== null &&
  'exitCode' in error &&
  typeof error.exitCode === 'number';

export const action = async (
  packageArguments: string[],
  { logger }: { logger: Logger }
): Promise<void> => {
  const appDir = process.cwd();

  try {
    // Makes STRAPI_LICENSE from the app's `.env` available, as `strapi build` does.
    await loadEnv(appDir);

    await runInstall({
      appDir,
      packageArguments,
      logger,
      dependencies: {
        isInteractive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
        env: process.env,
        homeDir: os.homedir(),
        now: new Date(),
        fetchImplementation: fetch,
        promptForPlugins,
        installPackages,
      },
    });
  } catch (error) {
    if (error instanceof EnterpriseInstallError) {
      logger.error(error.message);
      process.exit(1);
    }

    // The package manager already printed its own error, so only its exit code is kept.
    if (hasExitCode(error)) {
      process.exit(error.exitCode);
    }

    throw error;
  }
};
