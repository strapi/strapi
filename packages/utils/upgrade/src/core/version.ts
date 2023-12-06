import * as semver from 'semver';

export type SemVer = `${number}.${number}.${number}`;
export type LooseSemVer = `${number}` | `${number}.${number}` | `${number}.${number}.${number}`;

export enum VersionRelease {
  Current = 'current',
  Next = 'next',
  Latest = 'latest',
  Major = 'major',
  Minor = 'minor',
  Patch = 'patch',
}

export type Version = SemVer | VersionRelease;

type GtOp = '>' | '>=';
type LtOp = '<' | '<=';
type EqOp = '=';

export type VersionRangeAsString =
  | LooseSemVer
  | `${GtOp}${LooseSemVer}`
  | `${LtOp}${LooseSemVer}`
  | `${EqOp}${LooseSemVer}`
  | `${GtOp}${LooseSemVer} ${LtOp}${LooseSemVer}`;

export const isVersionRelease = (version: string): version is VersionRelease => {
  return Object.values<string>(VersionRelease).includes(version);
};

export const isLatestVersion = (str: string): str is VersionRelease.Latest => {
  return str === VersionRelease.Latest;
};

export const isNextVersion = (str: string): str is VersionRelease.Next => {
  return str === VersionRelease.Next;
};

export const isCurrentVersion = (str: string): str is VersionRelease.Current => {
  return str === VersionRelease.Current;
};

export const isVersion = (str: string): str is Version => {
  return isVersionRelease(str) || isSemVer(str);
};

export const formatSemVer = (
  version: semver.SemVer,
  format: 'x' | 'x.x' | 'x.x.x'
): LooseSemVer => {
  const { major, minor, patch } = version;
  const tokens = [major, minor, patch];

  return format
    .split('.')
    .map((_, i) => tokens[i])
    .join('.') as LooseSemVer;
};

export const isSemVer = (str: string): str is SemVer => {
  const tokens = str.split('.');
  return (
    tokens.length === 3 &&
    tokens.every((token) => !Number.isNaN(+token) && Number.isInteger(+token))
  );
};

export const createSemverRange = (range: VersionRangeAsString): semver.Range => {
  return new semver.Range(range);
};
