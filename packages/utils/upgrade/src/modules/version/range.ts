import semver from 'semver';

import { isSemVer, isSemVerReleaseType } from './semver';
import * as Version from './types';

export const rangeFactory = (range: string): Version.Range => {
  return new semver.Range(range);
};

export const rangeFromReleaseType = (current: Version.SemVer, identifier: Version.ReleaseType) => {
  const fromCurrentTo = (version: Version.LiteralVersion) => {
    return rangeFactory(`>${current.raw} <=${version}`);
  };

  switch (identifier) {
    case Version.ReleaseType.Major: {
      // semver.inc(_, 'major') will target <major + 1>.0.0 which is what we want
      // e.g. for 4.15.4, it'll return 5.0.0
      const nextMajor = semver.inc(current, 'major') as Version.LiteralSemVer;
      return fromCurrentTo(nextMajor);
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
