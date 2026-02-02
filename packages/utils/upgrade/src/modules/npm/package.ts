import assert from 'node:assert';
import semver from 'semver';
import execa from 'execa';
import { packageManager } from '@strapi/utils';

import { ProxyAgent } from 'undici';
import * as constants from './constants';
import { isLiteralSemVer } from '../version';

import type { Package as PackageInterface, NPMPackage, NPMPackageVersion } from './types';
import type { Version } from '../version';
import { Logger } from '../logger';

const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
const agent = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

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
      if (!packageManagerName) return undefined;

      const registryCommands = {
        yarn: ['config', 'get', 'npmRegistryServer'],
        npm: ['config', 'get', 'registry'],
      } as const;

      const command = registryCommands[packageManagerName as keyof typeof registryCommands];
      if (!command) {
        this.logger.warn(`Unsupported package manager: ${packageManagerName}`);
        return undefined;
      }

      const { stdout } = await execa(packageManagerName, command, { timeout: 10_000 });
      return stdout.trim() || undefined;
    } catch (error) {
      this.logger.warn('Failed to determine registry URL from package manager');
      return undefined;
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

    const response = await fetch(packageURL, {
      // @ts-expect-error Node.js fetch supports dispatcher (undici extension)
      dispatcher: agent,
    });

    // TODO: Use a validation library to make sure the response structure is correct
    assert(response.ok, `Request failed for ${packageURL}`);

    this.npmPackage = (await response.json()) as NPMPackage;

    return this;
  }

  versionExists(version: Version.SemVer) {
    return this.findVersion(version) !== undefined;
  }
}

export const npmPackageFactory = (name: string, cwd: string, logger: Logger) =>
  new Package(name, cwd, logger);
