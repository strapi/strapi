import type { Version } from '../version';

export type Kind = 'code' | 'json';
export type UID = `${Version.LiteralSemVer}-${string}-${Kind}`;

export interface Codemod {
  uid: UID;
  kind: Kind;
  version: Version.SemVer;
  baseDirectory: string;
  filename: string;
  path: string;

  /**
   * Return a formatted version of the codemod name
   */
  format(options?: FormatOptions): string;
}

export interface FormatOptions {
  stripKind?: boolean;
  stripExtension?: boolean;
  stripHyphens?: boolean;
}

export type List = Codemod[];

export interface VersionedCollection {
  version: Version.SemVer;
  codemods: List;
}
