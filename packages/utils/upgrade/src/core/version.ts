import * as semver from 'semver';

export type SemVer = `${number}.${number}.${number}`;
export type LatestVersion = 'latest';

export type AnyVersion = SemVer | LatestVersion;

export interface VersionRange {
  from: SemVer;
  to: AnyVersion;
}

export const createSemverRange = (range: VersionRange): semver.Range => {
  let semverRange = `>${range.from}`;

  // Add the upper boundary if range.to is different from 'latest'
  if (range.to !== 'latest') {
    semverRange += ` <=${range.to}`;
  }

  return new semver.Range(semverRange);
};
