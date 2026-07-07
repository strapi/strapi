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

export const isPinnedSemVer = (version: string): boolean => {
  return isLiteralSemVer(version) && semver.valid(version) === version;
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
      const isScopedStrapiPackage = name.startsWith(constants.SCOPED_STRAPI_PACKAGE_PREFIX);

      if (isScopedStrapiPackage && !isPinnedSemVer(version)) {
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
  const updated: MinimalPackageJSON = {
    ...packageJSON,
    dependencies: packageJSON.dependencies ? { ...packageJSON.dependencies } : undefined,
    devDependencies: packageJSON.devDependencies ? { ...packageJSON.devDependencies } : undefined,
  };

  for (const { name, section } of unpinned) {
    if (section === 'dependencies') {
      updated.dependencies = {
        ...updated.dependencies,
        [name]: pinVersion,
      };
    } else {
      updated.devDependencies = {
        ...updated.devDependencies,
        [name]: pinVersion,
      };
    }
  }

  return updated;
};
