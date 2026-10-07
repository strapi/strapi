import path from 'node:path';
import fse from 'fs-extra';
import semver from 'semver';

import { STRAPI_PACKAGE_NAME } from './constants';
import { EnterpriseInstallError } from './errors';
import { listAncestorDirectories } from './directories';
import type { Packument, PackumentVersion, StrapiPackageMetadata } from './registry';

export interface InstalledPackageJson {
  version?: string;
  homepage?: string;
  strapi?: StrapiPackageMetadata;
}

export const listNodeModulesDirectories = (appDir: string): string[] =>
  listAncestorDirectories(appDir).map((directory) => path.join(directory, 'node_modules'));

/** Reads the `package.json` of an installed package, found the way Node resolves packages. */
export const readInstalledPackageJson = async (
  appDir: string,
  packageName: string
): Promise<InstalledPackageJson | undefined> => {
  for (const nodeModulesDirectory of listNodeModulesDirectories(appDir)) {
    const packageJsonPath = path.join(nodeModulesDirectory, packageName, 'package.json');

    if (await fse.pathExists(packageJsonPath)) {
      return fse.readJson(packageJsonPath).catch(() => {
        throw new EnterpriseInstallError(
          `Could not read ${packageJsonPath}. Reinstall the app's dependencies, then try again.`
        );
      });
    }
  }

  return undefined;
};

export const readInstalledVersion = async (
  appDir: string,
  packageName: string
): Promise<string | undefined> => {
  const { version } = (await readInstalledPackageJson(appDir, packageName)) ?? {};

  return typeof version === 'string' ? version : undefined;
};

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'] as const;

/** The packages the app's own `package.json` depends on. */
export const readAppDependencyNames = async (appDir: string): Promise<Set<string>> => {
  const packageJson = await fse.readJson(path.join(appDir, 'package.json')).catch(() => ({}));

  return new Set(DEPENDENCY_FIELDS.flatMap((field) => Object.keys(packageJson?.[field] ?? {})));
};

/**
 * The installed version of a package the app depends on. Undefined when the app's `package.json`
 * does not list it, even if a parent `node_modules` holds a copy hoisted for another app of the
 * same monorepo: that copy is not the app's, so it is neither up to date nor an upgrade for it.
 */
export const readAppDependencyVersion = async (
  appDir: string,
  packageName: string
): Promise<string | undefined> =>
  (await readAppDependencyNames(appDir)).has(packageName)
    ? readInstalledVersion(appDir, packageName)
    : undefined;

export const canCheckStrapiCompatibility = (
  strapiVersion: string | undefined
): strapiVersion is string =>
  strapiVersion !== undefined &&
  semver.valid(strapiVersion) !== null &&
  semver.prerelease(strapiVersion) === null;

export interface VersionChoice {
  /** The highest stable version that fits the app's Strapi version. */
  targetVersion?: string;
  /** The highest stable version, whether it fits or not. */
  newestVersion?: string;
  /** The Strapi range the newest version requires, when it declares one. */
  newestVersionStrapiRange?: string;
}

const getStrapiRange = (packumentVersion: PackumentVersion | undefined) =>
  packumentVersion?.peerDependencies?.[STRAPI_PACKAGE_NAME];

const fitsStrapiVersion = (
  packumentVersion: PackumentVersion,
  strapiVersion: string | undefined
) => {
  const strapiRange = getStrapiRange(packumentVersion);

  return (
    !canCheckStrapiCompatibility(strapiVersion) ||
    strapiRange === undefined ||
    semver.satisfies(strapiVersion, strapiRange)
  );
};

export const pickTargetVersion = (
  packument: Packument,
  strapiVersion: string | undefined
): VersionChoice => {
  const latestVersion = packument['dist-tags']?.latest;
  const versionCap =
    latestVersion !== undefined && semver.valid(latestVersion) && !isPrerelease(latestVersion)
      ? latestVersion
      : undefined;

  const stableVersions = Object.values(packument.versions ?? {})
    .filter(
      (packumentVersion) =>
        semver.valid(packumentVersion.version) !== null &&
        semver.prerelease(packumentVersion.version) === null &&
        !packumentVersion.deprecated &&
        (versionCap === undefined || semver.lte(packumentVersion.version, versionCap))
    )
    .sort((left, right) => semver.rcompare(left.version, right.version));

  const newest = stableVersions[0];

  return {
    targetVersion: stableVersions.find((packumentVersion) =>
      fitsStrapiVersion(packumentVersion, strapiVersion)
    )?.version,
    newestVersion: newest?.version,
    newestVersionStrapiRange: getStrapiRange(newest),
  };
};

export const describeNewerIncompatibleVersion = (
  { targetVersion, newestVersion, newestVersionStrapiRange }: VersionChoice,
  installedVersion?: string
): string | undefined => {
  if (!newestVersion || newestVersion === targetVersion || !newestVersionStrapiRange) {
    return undefined;
  }

  // Nothing to announce when that version, or a later one, is already installed.
  if (
    installedVersion &&
    semver.valid(installedVersion) &&
    semver.gte(installedVersion, newestVersion)
  ) {
    return undefined;
  }

  return `${newestVersion} is available but requires Strapi ${newestVersionStrapiRange}.`;
};

export const resolveRequestedVersion = (
  packument: Packument,
  requestedVersion: string,
  strapiVersion: string | undefined
): string | undefined => {
  const publishedVersions = Object.keys(packument.versions ?? {});
  const taggedVersion = packument['dist-tags']?.[requestedVersion];

  if (publishedVersions.includes(requestedVersion)) {
    return requestedVersion;
  }

  if (taggedVersion !== undefined && publishedVersions.includes(taggedVersion)) {
    return taggedVersion;
  }

  if (!semver.validRange(requestedVersion)) {
    return undefined;
  }

  // A range asks for "something in it", not for one version: like the automatic choice, prefer a
  // version that is not deprecated and fits the app's Strapi, and like npm, prefer `latest`.
  const inRange = Object.values(packument.versions ?? {}).filter(
    (packumentVersion) =>
      semver.valid(packumentVersion.version) !== null &&
      semver.satisfies(packumentVersion.version, requestedVersion)
  );
  const notDeprecated = inRange.filter((packumentVersion) => !packumentVersion.deprecated);
  const fitting = notDeprecated.filter((packumentVersion) =>
    fitsStrapiVersion(packumentVersion, strapiVersion)
  );
  const pick = (candidates: PackumentVersion[]): string | undefined => {
    const versions = candidates.map((packumentVersion) => packumentVersion.version);
    const latestVersion = packument['dist-tags']?.latest;

    if (latestVersion !== undefined && versions.includes(latestVersion)) {
      return latestVersion;
    }

    return semver.maxSatisfying(versions, requestedVersion) ?? undefined;
  };

  return pick(fitting) ?? pick(notDeprecated) ?? pick(inRange);
};

/** The Strapi range a version requires, when the app's Strapi version is known not to fit it. */
export const findUnsupportedStrapiRange = (
  packument: Packument,
  version: string,
  strapiVersion: string | undefined
): string | undefined => {
  const strapiRange = getStrapiRange(packument.versions?.[version]);

  if (!canCheckStrapiCompatibility(strapiVersion) || strapiRange === undefined) {
    return undefined;
  }

  return semver.satisfies(strapiVersion, strapiRange) ? undefined : strapiRange;
};

/** A prerelease, such as an experimental build, is usually ahead of the latest stable release. */
export const isPrerelease = (version: string): boolean => semver.prerelease(version) !== null;

/**
 * True when semver lets the target break the installed version: a new major, or a new minor in 0.x,
 * as npm's `^` range reads it.
 */
export const isMajorUpgrade = (installedVersion: string, targetVersion: string): boolean =>
  semver.valid(installedVersion) !== null &&
  !semver.satisfies(targetVersion, `^${installedVersion}`);

/** True when the target is newer than what is installed. A newer install is never downgraded. */
export const isUpgrade = (installedVersion: string, targetVersion: string): boolean =>
  semver.valid(installedVersion) === null || semver.gt(targetVersion, installedVersion);
