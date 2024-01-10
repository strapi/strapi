import type { Version } from '../version';

export type Kind = 'code' | 'json';

export interface Codemod {
  kind: Kind;
  version: Version.SemVer;
  baseDirectory: string;
  filename: string;
  path: string;

  /**
   * Return a formatted version of the codemod name
   */
  format(): string;
}

export type List = Codemod[];

export interface VersionedCollection {
  version: Version.SemVer;
  codemods: List;
}
