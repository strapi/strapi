import type { Version } from '../version';

type NPMVersion = string;
type ISOString = string;

export interface Package {
  name: string;

  get isLoaded(): boolean;

  refresh(): Promise<this>;

  versionExists(version: Version.SemVer): boolean;

  getVersionsDict(): Record<NPMVersion, NPMPackageVersion>;
  getVersionsAsList(): NPMPackageVersion[];

  findVersion(version: Version.SemVer): NPMPackageVersion | undefined;
  findVersionsInRange(range: Version.Range): NPMPackageVersion[];
}

export interface NPMPackage {
  _id: string;
  _rev: string;
  name: string;
  description: string;
  homepage: string;
  keywords: string[];
  license: string;
  readme: string;
  readmeFilename: string;
  repository: PackageRepository;
  author: PackageAuthor;
  bugs: PackageBugs;
  distTags: PackageDistTags;
  versions: Record<NPMVersion, NPMPackageVersion>;
  time: PackageTime;
  maintainers: PackageMaintainer[];
}

export interface NPMPackageVersion {
  _id: string;
  _nodeVersion: string;
  _npmVersion: string;
  name: string;
  version: NPMVersion;
  description: string;
  homepage: string;
  main: string;
  license: string;
  keywords: string[];
  gitHead: string;
  bin: Record<string, string>;
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
  author: PackageAuthor;
  maintainers: PackageMaintainer[];
  repository: PackageRepository;
  bugs: PackageBugs;
  engines: Record<string, string>;
  dist: Dist;
  _npmUser: NpmUser;
  _npmOperationalInternal: NpmOperationalInternal;
  _hasShrinkwrap: boolean;
}

export interface Dist {
  integrity: string;
  shasum: string;
  tarball: string;
  fileCount: number;
  unpackedSize: number;
  'npm-signature': string;
  signatures: Signature[];
}

interface Signature {
  keyid: string;
  sig: string;
}

interface NpmUser {
  name: string;
  email: string;
}

interface NpmOperationalInternal {
  host: string;
  tmp: string;
}

export interface PackageDistTags {
  [key: string]: NPMVersion;
}

export interface PackageTime {
  created: ISOString;
  modified: ISOString;
  [key: NPMVersion]: ISOString;
}

export interface PackageRepository {
  type: string;
  url: string;
}

export interface PackageMaintainer {
  type: string;
  url: string;
}

export interface PackageAuthor {
  name: string;
  email: string;
  url: string;
}

export interface PackageBugs {
  url: string;
}
