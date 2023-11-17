import * as semver from 'semver';

export type SemVer = `${number}.${number}.${number}`;

export enum VersionRelease {
  Latest = 'latest',
  Major = 'major',
  Minor = 'minor',
  Patch = 'patch',
}

export type Version = SemVer | VersionRelease;

export interface VersionRange {
  from: SemVer;
  to: Version;
}

export const isVersionRelease = (version: string): version is VersionRelease => {
  return Object.values<string>(VersionRelease).includes(version);
};

export const isLatestVersion = (str: string): str is VersionRelease.Latest => {
  return str === VersionRelease.Latest;
};

export const isVersion = (str: string): str is Version => {
  return isVersionRelease(str) || isSemVer(str);
};

export const isSemVer = (str: string): str is SemVer => {
  const tokens = str.split('.');
  return (
    tokens.length === 3 &&
    tokens.every((token) => !Number.isNaN(+token) && Number.isInteger(+token))
  );
};

export const createSemverRange = (range: VersionRange): semver.Range => {
  let semverRange = `>${range.from}`;

  // Add the upper boundary if range.to is different from 'latest'
  if (range.to !== 'latest') {
    semverRange += ` <=${range.to}`;
  }

  return new semver.Range(semverRange);
};
