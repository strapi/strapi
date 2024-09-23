export type Version = number;

export type LiteralVersion =
  | `${Version}`
  | `${Version}.${Version}`
  | `${Version}.${Version}.${Version}`;

export type LiteralSemVer = `${Version}.${Version}.${Version}`;

export type { SemVer, Range } from 'semver';

export enum ReleaseType {
  Major = 'major',
  Minor = 'minor',
  Patch = 'patch',
}
