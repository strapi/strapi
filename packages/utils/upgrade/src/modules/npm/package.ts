import assert from 'node:assert';
import semver from 'semver';
import execa from 'execa';
import { packageManager } from '@strapi/utils';

import * as constants from './constants';
import { isLiteralSemVer } from '../version';

import type { Package as PackageInterface, NPMPackage, NPMPackageVersion } from './types';
import type { Version } from '../version';
import { Logger } from '../logger';

export class Package implements PackageInterface {
  name: string;

  cwd: string;

  private logger: Logger;

  private npmPackage: NPMPackage | null;

  constructor(name: string, cwd: string, logger: Logger) {
    this.name = name;
    this.cwd = cwd;
    this.logger = logger;
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

  private async getRegistryFromPackageManager(): Promise<string | undefined> {
    try {
      const packageManagerName = await packageManager.getPreferred(this.cwd);
      if (!packageManagerName) return;
      switch (packageManagerName) {
        case 'yarn': {
          const { stdout } = await execa('yarn', ['config', 'get', 'npmRegistryServer'], {
            timeout: 60_000,
          });
          return stdout.trim();
        }
        case 'npm': {
          const { stdout } = await execa('npm', ['config', 'get', 'registry'], { timeout: 60_000 });
          return stdout.trim();
        }
        default: {
          this.logger.warn(`Unsupported package manager: ${packageManagerName}`);
        }
      }
    } catch (_) {
      this.logger.warn('Failed to determine registry URL from package manager');
    }
  }

  private async determineRegistryUrl(): Promise<string> {
    if (process.env.NPM_REGISTRY_URL) {
      this.logger.debug(`Using NPM_REGISTRY_URL: ${process.env.NPM_REGISTRY_URL}`);
      return process.env.NPM_REGISTRY_URL.replace(/\/$/, '');
    }

    const packageManagerRegistry = await this.getRegistryFromPackageManager();
    if (packageManagerRegistry) {
      this.logger.debug(`Using package manager registry: ${packageManagerRegistry}`);
      return packageManagerRegistry.replace(/\/$/, '');
    }

    this.logger.debug(`Using default registry: ${constants.NPM_REGISTRY_URL}`);
    return constants.NPM_REGISTRY_URL.replace(/\/$/, '');
  }

  findVersion(version: Version.SemVer): NPMPackageVersion | undefined {
    const versions = this.getVersionsAsList();

    return versions.find((npmVersion) => semver.eq(npmVersion.version, version));
  }

  async refresh() {
    const packageURL = `${await this.determineRegistryUrl()}/${this.name}`;

    const response = await fetch(packageURL);

    // TODO: Use a validation library to make sure the response structure is correct
    assert(response.ok, `Request failed for ${packageURL}`);

    this.npmPackage = await response.json();

    return this;
  }

  versionExists(version: Version.SemVer) {
    return this.findVersion(version) !== undefined;
  }
}

export const npmPackageFactory = (name: string, cwd: string, logger: Logger) =>
  new Package(name, cwd, logger);
