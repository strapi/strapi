import semver from 'semver';

import * as Version from './types';
import { isSemverInstance, isSemVerReleaseType, semVerFactory } from './semver';

export const rangeFactory = (range: string): Version.Range => {
  return new semver.Range(range);
};

export const rangeFromReleaseType = (current: Version.SemVer, identifier: Version.ReleaseType) => {
  switch (identifier) {
    case Version.ReleaseType.Latest: {
      // Match anything greater than the current version
      return rangeFactory(`>${current.raw}`);
    }
    case Version.ReleaseType.Major: {
      // For example, 4.15.4 returns 5.0.0
      const nextMajor = semVerFactory(current.raw).inc('major');

      // Using only the major version as the upper limit allows any minor,
      // patch, or build version to be taken in the range.
      //
      // For example, if the current version is "4.15.4", incrementing the
      // major version would result in "5.0.0".
      // The generated rule is ">4.15.4 <=5", allowing any version
      // greater than "4.15.4" but less than "6.0.0-0".
      return rangeFactory(`>${current.raw} <=${nextMajor.major}`);
    }
    case Version.ReleaseType.Minor: {
      // For example, 4.15.4 returns 5.0.0
      const nextMajor = semVerFactory(current.raw).inc('major');

      // Using the <major>.<minor>.<patch> version as the upper limit allows any minor,
      // patch, or build versions to be taken in the range.
      //
      // For example, if the current version is "4.15.4", incrementing the
      // major version would result in "5.0.0".
      // The generated rule is ">4.15.4 <5.0.0", allowing any version
      // greater than "4.15.4" but less than "5.0.0".
      return rangeFactory(`>${current.raw} <${nextMajor.raw}`);
    }
    case Version.ReleaseType.Patch: {
      // For example, 4.15.4 returns 4.16.0
      const nextMinor = semVerFactory(current.raw).inc('minor');

      // Using only the minor version as the upper limit allows any patch
      // or build versions to be taken in the range.
      //
      // For example, if the current version is "4.15.4", incrementing the
      // minor version would result in "4.16.0".
      // The generated rule is ">4.15.4 <4.16.0", allowing any version
      // greater than "4.15.4" but less than "4.16.0".
      return rangeFactory(`>${current.raw} <${nextMinor.raw}`);
    }
    default: {
      throw new Error('Not implemented');
    }
  }
};

export const rangeFromVersions = (
  currentVersion: Version.SemVer,
  target: Version.ReleaseType | Version.SemVer
) => {
  if (isSemverInstance(target)) {
    return rangeFactory(`>${currentVersion.raw} <=${target.raw}`);
  }

  if (isSemVerReleaseType(target)) {
    return rangeFromReleaseType(currentVersion, target);
  }

  throw new Error(`Invalid target set: ${target}`); // TODO: better errors
};

export const isValidStringifiedRange = (str: string) => semver.validRange(str) !== null;

export const isRangeInstance = (range: unknown): range is semver.Range => {
  return range instanceof semver.Range;
};
