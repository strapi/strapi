import assert from 'node:assert';
import chalk from 'chalk';
import { packageManager } from '@strapi/utils';

import {
  codemodRepositoryFactory,
  constants as codemodRepositoryConstants,
} from '../codemod-repository';
import { createJSONTransformAPI, saveJSON } from '../json';
import { constants as projectConstants } from '../project';
import { isLiteralSemVer, isSemVer, rangeFromVersions, semVerFactory } from '../version';
import { unknownToError } from '../error';
import * as f from '../format';

import type { ConfirmationCallback, Upgrader as UpgraderInterface, UpgradeReport } from './types';
import type { Version } from '../version';
import type { Logger } from '../logger';
import type { Requirement } from '../requirement';
import type { NPM } from '../npm';
import type { Project } from '../project';

type DependenciesEntries = Array<[name: string, version: Version.LiteralSemVer]>;

export class Upgrader implements UpgraderInterface {
  private readonly project: Project;

  private readonly npmPackage: NPM.Package;

  private target: Version.SemVer;

  private isDry: boolean;

  private logger: Logger | null;

  private requirements: Requirement.Requirement[];

  private confirmationCallback: ConfirmationCallback | null;

  constructor(project: Project, target: Version.SemVer, npmPackage: NPM.Package) {
    this.project = project;
    this.target = target;
    this.npmPackage = npmPackage;

    this.isDry = false;

    this.requirements = [];

    this.logger = null;
    this.confirmationCallback = null;
  }

  setRequirements(requirements: Requirement.Requirement[]) {
    this.requirements = requirements;
    return this;
  }

  setTarget(target: Version.SemVer) {
    this.target = target;
    return this;
  }

  setLogger(logger: Logger) {
    this.logger = logger;
    return this;
  }

  onConfirm(callback: ConfirmationCallback | null) {
    this.confirmationCallback = callback;
    return this;
  }

  dry(enabled: boolean = true) {
    this.isDry = enabled;
    return this;
  }

  addRequirement(requirement: Requirement.Requirement) {
    this.requirements.push(requirement);
    return this;
  }

  async upgrade(): Promise<UpgradeReport> {
    if (this.isDry) {
      this.logger?.warn(
        'Running the upgrade in dry mode. No files will be modified during the process.'
      );
    }
    this.logger?.debug(
      `Upgrading from ${f.version(this.project.strapiVersion)} to ${f.version(this.target)}`
    );

    const range = rangeFromVersions(this.project.strapiVersion, this.target);
    const npmVersionsMatches = this.npmPackage?.findVersionsInRange(range) ?? [];

    this.logger?.debug(
      `Found ${f.highlight(npmVersionsMatches.length)} versions satisfying ${f.versionRange(range)}`
    );

    try {
      this.logger?.info(f.upgradeStep('Checking requirement', [1, 4]));
      await this.checkRequirements(this.requirements, {
        npmVersionsMatches,
        project: this.project,
        target: this.target,
      });

      this.logger?.info(f.upgradeStep('Upgrading Strapi dependencies', [2, 4]));
      await this.updateDependencies();

      this.logger?.info(f.upgradeStep('Installing dependencies', [3, 4]));
      await this.installDependencies();

      this.logger?.info(f.upgradeStep('Applying the latest code modifications', [4, 4]));
      await this.runCodemods(range);
    } catch (e) {
      return erroredReport(unknownToError(e));
    }

    return successReport();
  }

  private async checkRequirements(
    requirements: Requirement.Requirement[],
    context: Requirement.TestContext
  ) {
    for (const requirement of requirements) {
      const { pass, error } = await requirement.test(context);

      if (pass) {
        await this.onSuccessfulRequirement(requirement, context);
      } else {
        await this.onFailedRequirement(requirement, error);
      }
    }
  }

  private async onSuccessfulRequirement(
    requirement: Requirement.Requirement,
    context: Requirement.TestContext
  ): Promise<void> {
    const hasChildren = requirement.children.length > 0;

    if (hasChildren) {
      await this.checkRequirements(requirement.children, context);
    }
  }

  private async onFailedRequirement(
    requirement: Requirement.Requirement,
    originalError: Error
  ): Promise<void> {
    const errorMessage = `Requirement failed: ${originalError.message} (${f.highlight(
      requirement.name
    )})`;
    const warningMessage = originalError.message;
    const confirmationMessage = `Ignore optional requirement "${f.highlight(requirement.name)}" ?`;

    const error = new Error(errorMessage);

    if (requirement.isRequired) {
      throw error;
    }

    this.logger?.warn(warningMessage);

    const response = await this.confirmationCallback?.(confirmationMessage);

    if (!response) {
      throw error;
    }
  }

  private async updateDependencies(): Promise<void> {
    const { packageJSON, packageJSONPath } = this.project;

    const json = createJSONTransformAPI(packageJSON);

    const dependencies = json.get<Record<string, string>>('dependencies', {});
    const strapiDependencies = this.getScopedStrapiDependencies(dependencies);

    this.logger?.debug(`Found ${f.highlight(strapiDependencies.length)} dependency(ies) to update`);
    strapiDependencies.forEach((dependency) =>
      this.logger?.debug(`- ${dependency[0]} (${dependency[1]} -> ${this.target})`)
    );

    if (strapiDependencies.length === 0) {
      return;
    }

    strapiDependencies.forEach(([name]) => json.set(`dependencies.${name}`, this.target.raw));

    const updatedPackageJSON = json.root();

    if (this.isDry) {
      this.logger?.debug(`Skipping dependencies update (${chalk.italic('dry mode')}`);
      return;
    }

    await saveJSON(packageJSONPath, updatedPackageJSON);
  }

  private getScopedStrapiDependencies(dependencies: Record<string, string>): DependenciesEntries {
    const { strapiVersion } = this.project;

    const strapiDependencies: DependenciesEntries = [];

    // Find all @strapi/* packages matching the current Strapi version
    for (const [name, version] of Object.entries(dependencies)) {
      const isScopedStrapiPackage = name.startsWith(projectConstants.SCOPED_STRAPI_PACKAGE_PREFIX);
      const isOnCurrentStrapiVersion = isLiteralSemVer(version) && version === strapiVersion.raw;

      if (isScopedStrapiPackage && isOnCurrentStrapiVersion) {
        strapiDependencies.push([name, version]);
      }
    }

    return strapiDependencies;
  }

  private async installDependencies(): Promise<void> {
    const projectPath = this.project.cwd;

    const packageManagerName = await packageManager.getPreferred(projectPath);

    this.logger?.debug(`Using ${f.highlight(packageManagerName)} as package manager`);

    if (this.isDry) {
      this.logger?.debug(`Skipping dependencies installation (${chalk.italic('dry mode')}`);
      return;
    }

    await packageManager.installDependencies(projectPath, packageManagerName, {
      stdout: this.logger?.stdout,
      stderr: this.logger?.stderr,
    });
  }

  private async runCodemods(range: Version.Range): Promise<void> {
    const repository = codemodRepositoryFactory(
      codemodRepositoryConstants.INTERNAL_CODEMODS_DIRECTORY
    );

    // Make sure we have access to the latest snapshots of codemods on the system
    repository.refresh();

    const versionedCodemods = repository.findByRange(range);

    const hasCodemodsToRun = versionedCodemods.length > 0;
    if (!hasCodemodsToRun) {
      this.logger?.debug(`Found no codemods to run for ${f.version(this.target)}`);
      return;
    }

    this.logger?.debug(`Found codemods for ${f.highlight(versionedCodemods.length)} version(s)`);
    versionedCodemods.forEach(({ version, codemods }) =>
      this.logger?.debug(`- ${f.version(version)} (${codemods.length})`)
    );

    // Flatten the collection to a single list of codemods, the original list should already be sorted
    const codemods = versionedCodemods.map(({ codemods }) => codemods).flat();

    const reports = await this.project.runCodemods(codemods, { dry: this.isDry });

    this.logger?.raw(f.reports(reports));
  }
}

export const upgraderFactory = (
  project: Project,
  target: Version.ReleaseType | Version.SemVer,
  npmPackage: NPM.Package
) => {
  const range = rangeFromVersions(project.strapiVersion, target);
  const npmVersionsMatches = npmPackage.findVersionsInRange(range);

  // The targeted version is the latest one that matches the given range
  const targetedNPMVersion = npmVersionsMatches.at(-1);

  assert(targetedNPMVersion, `Could not find any version in the range ${f.versionRange(range)}`);

  // Make sure the latest version matched in the range is the same as the targeted one (only if target is a semver)
  if (isSemVer(target) && target.raw !== targetedNPMVersion.version) {
    throw new Error(
      `${f.version(target)} doesn't exist on the registry. Closest version found is ${
        targetedNPMVersion.version
      }`
    );
  }

  if (!isLiteralSemVer(targetedNPMVersion.version)) {
    throw new Error('Something wrong happened with the target version (not a literal semver)');
  }

  const semverTarget = semVerFactory(targetedNPMVersion.version);

  return new Upgrader(project, semverTarget, npmPackage);
};

const successReport = (): UpgradeReport => ({ success: true, error: null });
const erroredReport = (error: Error): UpgradeReport => ({ success: false, error });
