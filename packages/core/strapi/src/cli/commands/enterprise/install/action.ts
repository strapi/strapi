import os from 'node:os';

import { loadEnv } from '../../../../node/core/env';
import type { Logger } from '../../../utils/logger';
import { ENTERPRISE_SCOPE, STRAPI_PACKAGE_NAME } from './constants';
import { discoverEnterprisePlugins } from './discovery';
import { EnterpriseInstallError, PackageManagerError, PromptCancelledError } from './errors';
import { buildInstallCommand, installPackages } from './install-packages';
import { promptForLicense, resolveLicense } from './license';
import { detectPackageManager } from './package-manager';
import { resolvePluginStatus } from './plugin-status';
import { prepareRegistryAccess } from './registry-access';
import { fetchPackument } from './registry';
import { buildPluginRow, isSelectable, orderVisibleRows, promptForPlugins } from './selection';
import { printSetupLinks } from './setup-links';
import {
  canCheckStrapiCompatibility,
  findUnsupportedStrapiRange,
  isPrerelease,
  readAppDependencyVersion,
  readInstalledVersion,
  resolveRequestedVersion,
} from './versions';

interface InstallDependencies {
  isInteractive: boolean;
  env: NodeJS.ProcessEnv;
  homeDir: string;
  now: Date;
  fetchImplementation: typeof fetch;
  promptForLicense: typeof promptForLicense;
  promptForPlugins: typeof promptForPlugins;
  installPackages: typeof installPackages;
}

const describeNoStableRelease = (packageName: string) =>
  `${packageName} has no stable release yet. To install a prerelease, name its version: ${packageName}@<version>.`;

const describeStrapiMismatch = (
  packageName: string,
  requiredStrapiRange: string,
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

const ENTERPRISE_PACKAGE_NAME = new RegExp(`^${ENTERPRISE_SCOPE}/[a-z0-9-][a-z0-9._-]*$`);
const MAX_PACKAGE_NAME_LENGTH = 214;

const isValidPackageName = (packageName: string) =>
  packageName.length <= MAX_PACKAGE_NAME_LENGTH && ENTERPRISE_PACKAGE_NAME.test(packageName);

interface RequestedPackage {
  packageName: string;
  /** A version or a tag, when the argument names one. */
  requestedVersion?: string;
}

export const parsePackageArgument = (packageArgument: string): RequestedPackage => {
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

  if (!isValidPackageName(packageName)) {
    throw new EnterpriseInstallError(`${packageArgument} is not a valid package name.`);
  }

  return { packageName, requestedVersion: requestedVersion || undefined };
};

const resolveNamedPackages = async (
  requestedPackages: RequestedPackage[],
  { appDir, license, strapiVersion, logger, dependencies }: InstallContext
): Promise<string[]> => {
  const installSpecs: string[] = [];

  for (const { packageName, requestedVersion } of requestedPackages) {
    const lookup = await fetchPackument({
      packageName,
      license,
      fetchImplementation: dependencies.fetchImplementation,
    });
    const installedVersion = await readAppDependencyVersion(appDir, packageName);

    if (requestedVersion && lookup.status === 'available') {
      const resolvedVersion = resolveRequestedVersion(
        lookup.packument,
        requestedVersion,
        strapiVersion
      );

      if (!resolvedVersion) {
        throw new EnterpriseInstallError(
          `${packageName} has no version or tag ${requestedVersion}.`
        );
      }

      if (resolvedVersion === installedVersion) {
        logger.info(`${packageName} ${resolvedVersion} is already installed.`);
        continue;
      }

      const unsupportedStrapiRange = findUnsupportedStrapiRange(
        lookup.packument,
        resolvedVersion,
        strapiVersion
      );

      if (unsupportedStrapiRange) {
        logger.warn(
          `${packageName} ${resolvedVersion} requires Strapi ${unsupportedStrapiRange} and this app uses ${strapiVersion}. Strapi may not start until you upgrade it.`
        );
      }

      installSpecs.push(`${packageName}@${resolvedVersion}`);
      continue;
    }

    const status = resolvePluginStatus({ lookup, installedVersion, strapiVersion });

    switch (status.state) {
      case 'not-licensed':
        throw new EnterpriseInstallError(
          `Your license does not include ${packageName}, or it does not exist. Run strapi enterprise install without a name to see the plugins you can install.`
        );
      case 'not-found':
        throw new EnterpriseInstallError(
          `No Enterprise package named ${packageName}. Run strapi enterprise install without a name to see the plugins you can install.`
        );
      case 'no-stable-release':
        throw new EnterpriseInstallError(describeNoStableRelease(packageName));
      case 'no-compatible-version':
        throw new EnterpriseInstallError(
          describeStrapiMismatch(packageName, status.requiredStrapiRange, strapiVersion)
        );
      default:
        break;
    }

    if (status.newerVersionNote) {
      logger.info(`${packageName}: ${status.newerVersionNote}`);
    }

    if (status.state === 'installed') {
      logger.info(`${packageName} ${installedVersion} is already installed and up to date.`);
      continue;
    }

    if (installedVersion && isPrerelease(installedVersion)) {
      logger.info(
        `${packageName}: replacing the installed prerelease ${installedVersion} with the stable release ${status.targetVersion}.`
      );
    }

    if (status.state === 'upgrade' && status.isMajorUpgrade) {
      logger.warn(
        `${packageName}: upgrading from ${installedVersion} to ${status.targetVersion}, a major upgrade that may include breaking changes.`
      );
    }

    installSpecs.push(`${packageName}@${status.targetVersion}`);
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
    fetchImplementation: dependencies.fetchImplementation,
  });

  const rows = discoveredPlugins.map(({ entry, lookup, installedVersion }) =>
    buildPluginRow({ entry, lookup, installedVersion, strapiVersion })
  );
  const isAnyPluginLicensed = discoveredPlugins.some(({ lookup }) => lookup.status === 'available');

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

      if (row.state === 'installed' && row.newerVersionNote) {
        logger.info(`${packageName}: ${row.newerVersionNote}`);
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
  // The checks that need no license come first, so a mistake there writes nothing, not even the
  // license.txt a pasted license is saved to.
  const requestedPackages = packageArguments.map(parsePackageArgument);

  if (requestedPackages.length === 0 && !dependencies.isInteractive) {
    throw new EnterpriseInstallError(
      'Pass package names, or run the command in an interactive terminal.'
    );
  }

  const packageManager = await detectPackageManager(appDir);

  const { license, source: licenseSource } = await resolveLicense({
    appDir,
    isInteractive: dependencies.isInteractive,
    logger,
    env: dependencies.env,
    now: dependencies.now,
    prompt: dependencies.promptForLicense,
  });

  const registryAccess = await prepareRegistryAccess({
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
    requestedPackages.length > 0
      ? await resolveNamedPackages(requestedPackages, context)
      : await selectPlugins(context);

  if (installSpecs.length === 0) {
    logger.info('Nothing to install.');
    return;
  }

  await registryAccess.apply();

  const { command, args } = buildInstallCommand(packageManager, installSpecs);
  logger.info(`Running ${command} ${args.join(' ')}`);

  const installedPackages = await Promise.all(
    installSpecs.map(async (installSpec) => {
      const { packageName } = parsePackageArgument(installSpec);
      const previousVersion = await readAppDependencyVersion(appDir, packageName);

      return { packageName, replacesInstalledVersion: previousVersion !== undefined };
    })
  );

  await dependencies.installPackages({ appDir, packageManager, installSpecs });

  await printSetupLinks({ appDir, installedPackages, logger });
};

/**
 * The exit code for an error, after reporting it in one line. The package manager prints its own
 * output when an install fails, so only its exit code is kept then.
 */
export const reportInstallError = (error: unknown, logger: Logger): number => {
  if (error instanceof PackageManagerError) {
    return error.exitCode;
  }

  if (error instanceof PromptCancelledError) {
    return 130;
  }

  if (error instanceof EnterpriseInstallError) {
    logger.error(error.message);
    return 1;
  }

  const message = error instanceof Error ? error.message : String(error);
  logger.error(`strapi enterprise install failed: ${message}`);
  return 1;
};

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
        promptForLicense,
        promptForPlugins,
        installPackages,
      },
    });
  } catch (error) {
    process.exit(reportInstallError(error, logger));
  }
};
