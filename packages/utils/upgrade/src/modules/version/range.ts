import semver from 'semver';

import * as Version from './types';
import { isSemVer, isSemVerReleaseType } from './semver';

export const rangeFactory = (range: string): Version.Range => {
  return new semver.Range(range);
};

export const rangeFromReleaseType = (current: Version.SemVer, identifier: Version.ReleaseType) => {
  switch (identifier) {
    case Version.ReleaseType.Major: {
      // semver.inc(_, 'major') will target <major + 1>.0.0 which is what we want
      // e.g. for 4.15.4, it'll return 5.0.0
      const nextMajor = semver.inc(current, 'major') as Version.LiteralSemVer;
      return rangeFactory(`>${current.raw} <=${nextMajor}`);
    }
    case Version.ReleaseType.Patch: {
      // This will return the premionr for the next minor
      // e.g. for 4.15.4, it'll return 4.16.0-0
      const preMinor = semver.inc(current, 'preminor') as Version.LiteralSemVer;
      return rangeFactory(`>${current.raw} <${preMinor}`);
    }
    case Version.ReleaseType.Minor: {
      // This will return the premajor for the next major
      // e.g. for 4.15.4, it'll return 5.0.0-0
      const preMajor = semver.inc(current, 'premajor') as Version.LiteralSemVer;
      return rangeFactory(`>${current.raw} <${preMajor}`);
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
  if (isSemVer(target)) {
    return rangeFactory(`>${currentVersion.raw} <=${target.raw}`);
  }

  if (isSemVerReleaseType(target)) {
    return rangeFromReleaseType(currentVersion, target);
  }

  throw new Error(`Invalid target set: ${target}`); // TODO: better errors
};
