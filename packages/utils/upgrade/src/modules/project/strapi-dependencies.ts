import semver from 'semver';

import { isLiteralSemVer, semVerFactory } from '../version';
import * as constants from './constants';

import type { Version } from '../version';
import type { AppProject } from './project';
import type { MinimalPackageJSON } from './types';

export type StrapiDependencySection = 'dependencies' | 'devDependencies';

export type UnpinnedStrapiDependency = {
  name: string;
  declaredVersion: string;
  section: StrapiDependencySection;
};

const asDependencyRecord = (value: unknown): Record<string, string> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, string>;
};

export const getPackageDependencyRecords = (packageJSON: MinimalPackageJSON) => {
  return {
    dependencies: asDependencyRecord(packageJSON.dependencies),
    devDependencies: asDependencyRecord(packageJSON.devDependencies),
  };
};

export const isPinnedSemVer = (version: string): boolean => {
  return isLiteralSemVer(version) && semver.valid(version) === version;
};

const followsStrapiReleaseVersion = (name: string): boolean => {
  return (
    name.startsWith(constants.SCOPED_STRAPI_PACKAGE_PREFIX) &&
    !constants.NON_LOCKSTEP_STRAPI_PACKAGE_NAMES.includes(name)
  );
};

export const findUnpinnedStrapiDependencies = (
  dependencies: Record<string, string> | undefined,
  devDependencies: Record<string, string> | undefined
): UnpinnedStrapiDependency[] => {
  const unpinned: UnpinnedStrapiDependency[] = [];

  const sections: Array<[StrapiDependencySection, Record<string, string> | undefined]> = [
    ['dependencies', dependencies],
    ['devDependencies', devDependencies],
  ];

  for (const [section, deps] of sections) {
    if (!deps) {
      continue;
    }

    for (const [name, version] of Object.entries(deps)) {
      if (followsStrapiReleaseVersion(name) && !isPinnedSemVer(version)) {
        unpinned.push({ name, declaredVersion: version, section });
      }
    }
  }

  return unpinned;
};

export const getStrapiPinTargetVersion = (project: AppProject): Version.SemVer => {
  const declared = project.packageJSON.dependencies?.[constants.STRAPI_DEPENDENCY_NAME];

  if (!declared) {
    throw new Error(
      `No version of ${constants.STRAPI_DEPENDENCY_NAME} was found in ${project.packageJSON.name}`
    );
  }

  if (isPinnedSemVer(declared)) {
    return semVerFactory(declared);
  }

  const minVersion = semver.minVersion(declared);

  if (minVersion) {
    return semVerFactory(minVersion.version);
  }

  return project.getInstalledStrapiVersion();
};

export const pinStrapiDependencies = (
  packageJSON: MinimalPackageJSON,
  pinVersion: string,
  unpinned: UnpinnedStrapiDependency[]
): MinimalPackageJSON => {
  const dependencies: Record<string, string> = {
    ...asDependencyRecord(packageJSON.dependencies),
  };
  const devDependencies: Record<string, string> = {
    ...asDependencyRecord(packageJSON.devDependencies),
  };

  for (const { name, section } of unpinned) {
    if (section === 'dependencies') {
      dependencies[name] = pinVersion;
    } else {
      devDependencies[name] = pinVersion;
    }
  }

  return {
    ...packageJSON,
    dependencies,
    devDependencies,
  };
};
