import assert from 'node:assert';
import fse from 'fs-extra';
import semver from 'semver';
import path from 'node:path';

import { codemodFactory, constants } from '../codemod';
import { semVerFactory } from '../version';

import type { Codemod } from '../codemod';
import type { Version } from '../version';

import type { CodemodRepository as CodemodRepositoryInterface } from './types';

export class CodemodRepository implements CodemodRepositoryInterface {
  private groups: Record<Version.LiteralSemVer, Codemod.Codemod[]>;
  private versions: Version.SemVer[];

  public cwd: string;

  constructor(cwd: string) {
    assert(fse.existsSync(cwd), `Invalid codemods directory provided "${cwd}"`);

    this.cwd = cwd;

    this.groups = {};
    this.versions = [];
  }

  refresh() {
    this.refreshAvailableVersions();
    this.refreshAvailableFiles();

    return this;
  }

  count(version: Version.SemVer) {
    return this.findByVersion(version).length;
  }

  countRange(range: Version.Range) {
    return this.findByRange(range).length;
  }

  exists(version: Version.SemVer) {
    return version.raw in this.groups;
  }

  findByRange(range: Version.Range) {
    const entries = Object.entries(this.groups) as Array<[Version.LiteralSemVer, Codemod.List]>;

    return entries
      .filter(([version]) => range.test(version))
      .map<Codemod.VersionedCollection>(([version, codemods]) => ({
        version: semVerFactory(version),
        codemods,
      }));
  }

  findByVersion(version: Version.SemVer) {
    const literalVersion = version.raw as Version.LiteralSemVer;
    const codemods = this.groups[literalVersion];

    return codemods ?? [];
  }

  private refreshAvailableVersions() {
    this.versions = fse
      .readdirSync(this.cwd) // Only keep root directories
      .filter((filename) => fse.statSync(path.join(this.cwd, filename)).isDirectory())
      // Paths should be valid semver
      .filter((filename): filename is Version.LiteralSemVer => semver.valid(filename) !== null)
      // Transform files names to SemVer instances
      .map<Version.SemVer>((version) => semVerFactory(version))
      // Sort versions in ascending order
      .sort(semver.compare);

    return this;
  }

  private refreshAvailableFiles() {
    this.groups = {};

    for (const version of this.versions) {
      this.refreshAvailableFilesForVersion(version);
    }
  }

  private refreshAvailableFilesForVersion(version: Version.SemVer) {
    const literalVersion = version.raw as Version.LiteralSemVer;
    const versionDirectory = path.join(this.cwd, literalVersion);

    // Ignore obsolete versions
    if (!fse.existsSync(versionDirectory)) {
      return;
    }

    this.groups[literalVersion] = fse
      .readdirSync(versionDirectory)
      // Make sure the filenames are valid codemod files
      .filter((filename) => fse.statSync(path.join(versionDirectory, filename)).isFile())
      .filter((filename) => constants.CODEMOD_FILE_REGEXP.test(filename))
      // Transform the filenames into Codemod instances
      .map((filename) => {
        const kind = parseCodemodKindFromFilename(filename);
        const baseDirectory = this.cwd;

        return codemodFactory({ kind, baseDirectory, version, filename });
      });
  }
}

export const parseCodemodKindFromFilename = (filename: string): Codemod.Kind => {
  const kind = filename.split('.').at(-2) as Codemod.Kind | undefined;

  assert(kind !== undefined);
  assert(constants.CODEMOD_ALLOWED_SUFFIXES.includes(kind));

  return kind;
};

export const codemodRepositoryFactory = (cwd: string) => new CodemodRepository(cwd);
