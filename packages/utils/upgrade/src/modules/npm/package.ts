import assert from 'node:assert';
import semver from 'semver';

import * as constants from './constants';
import { isLiteralSemVer } from '../version';

import type { Package as PackageInterface, NPMPackage, NPMPackageVersion } from './types';
import type { Version } from '../version';

export class Package implements PackageInterface {
  name: string;

  packageURL: string;

  private npmPackage: NPMPackage | null;

  constructor(name: string) {
    this.name = name;
    this.packageURL = `${constants.NPM_REGISTRY_URL}/${name}`;
    this.npmPackage = null;
  }

  get isLoaded() {
    return this.npmPackage !== null;
  }

  private assertPackageIsLoaded(npmPackage: NPMPackage | null): asserts npmPackage is NPMPackage {
    assert(this.isLoaded, 'The package is not loaded yet');
  }

  getVersionsDict() {
    this.assertPackageIsLoaded(this.npmPackage);

    return this.npmPackage.versions;
  }

  getVersionsAsList() {
    this.assertPackageIsLoaded(this.npmPackage);

    return Object.values(this.npmPackage.versions);
  }

  findVersionsInRange(range: Version.Range) {
    const versions = this.getVersionsAsList();

    return (
      versions
        // Only select versions matching the upgrade range
        .filter((v) => range.test(v.version))
        // Only select supported version format (x.x.x)
        .filter((v) => isLiteralSemVer(v.version))
        // Sort in ascending order
        .sort((v1, v2) => semver.compare(v1.version, v2.version))
    );
  }

  findVersion(version: Version.SemVer): NPMPackageVersion | undefined {
    const versions = this.getVersionsAsList();

    return versions.find((npmVersion) => semver.eq(npmVersion.version, version));
  }

  async refresh() {
    const response = await fetch(this.packageURL);

    // TODO: Use a validation library to make sure the response structure is correct
    assert(response.ok, `Request failed for ${this.packageURL}`);

    this.npmPackage = await response.json();

    return this;
  }

  versionExists(version: Version.SemVer) {
    return this.findVersion(version) !== undefined;
  }
}

export const npmPackageFactory = (name: string) => new Package(name);
