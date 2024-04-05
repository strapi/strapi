import path from 'node:path';

import { isApplicationProject } from '../../modules/project';
import { Version, isSemverInstance, rangeFactory, isRangeInstance } from '../../modules/version';

import type { Project } from '../../modules/project';

export const resolvePath = (cwd?: string) => path.resolve(cwd ?? process.cwd());

export const getRangeFromTarget = (
  currentVersion: Version.SemVer,
  target: Version.ReleaseType | Version.LiteralSemVer
) => {
  if (isSemverInstance(target)) {
    return rangeFactory(target);
  }

  const { major, minor, patch } = currentVersion;

  switch (target) {
    case Version.ReleaseType.Major:
      return rangeFactory(`${major}`);
    case Version.ReleaseType.Minor:
      return rangeFactory(`${major}.${minor}`);
    case Version.ReleaseType.Patch:
      return rangeFactory(`${major}.${minor}.${patch}`);
    default:
      throw new Error(`Invalid target set: ${target}`);
  }
};

export const findRangeFromTarget = (
  project: Project,
  target: Version.ReleaseType | Version.LiteralSemVer | Version.Range
): Version.Range => {
  // If a range is manually defined, use it
  if (isRangeInstance(target)) {
    return target;
  }

  // If the current project is a Strapi application
  // Get the range from the given target
  if (isApplicationProject(project)) {
    return getRangeFromTarget(project.strapiVersion, target);
  }

  // Else, if the project is a Strapi plugin or anything else
  // Set the range to match any version
  return rangeFactory('*');
};
