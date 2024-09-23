import chalk from 'chalk';
import semver from 'semver';
import { packageManager } from '@strapi/utils';

import { createJSONTransformAPI, saveJSON } from '../json';
import { constants as projectConstants } from '../project';
import {
  isSemverInstance,
  isSemVerReleaseType,
  isValidSemVer,
  rangeFromVersions,
  semVerFactory,
} from '../version';
import { unknownToError } from '../error';
import * as f from '../format';
import { codemodRunnerFactory } from '../codemod-runner';

import type { Upgrader as UpgraderInterface, UpgradeReport } from './types';
import type { Version } from '../version';
import type { Logger } from '../logger';
import type { Requirement } from '../requirement';
import type { NPM } from '../npm';
import type { AppProject } from '../project';
import type { ConfirmationCallback } from '../common/types';

type DependenciesEntries = Array<[name: string, version: Version.SemVer]>;

export class Upgrader implements UpgraderInterface {
  private readonly project: AppProject;

  private readonly npmPackage: NPM.Package;

  private target: Version.SemVer;

  private codemodsTarget!: Version.SemVer;

  private isDry: boolean;

  private logger: Logger | null;

  private requirements: Requirement.Requirement[];

  private confirmationCallback: ConfirmationCallback | null;

  constructor(project: AppProject, target: Version.SemVer, npmPackage: NPM.Package) {
    this.project = project;
    this.npmPackage = npmPackage;

    this.target = target;
    this.syncCodemodsTarget();

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

  syncCodemodsTarget() {
    // Extract the <major>.<minor>.<patch> version from the target and assign it to the codemods target
    //
    // This is useful when dealing with alphas, betas or release candidates:
    // e.g. "5.0.0-beta.951" becomes "5.0.0"
    //
    // For experimental versions (e.g. "0.0.0-experimental.hex"), it is necessary to
    // override the codemods target manually in order to run the appropriate ones.
    this.codemodsTarget = semVerFactory(
      `${this.target.major}.${this.target.minor}.${this.target.patch}`
    );

    this.logger?.debug?.(
      `The codemods target has been synced with the upgrade target. The codemod runner will now look for ${f.version(
        this.codemodsTarget
      )}`
    );

    return this;
  }

  overrideCodemodsTarget(target: Version.SemVer) {
    this.codemodsTarget = target;

    this.logger?.debug?.(
      `Overriding the codemods target. The codemod runner will now look for ${f.version(target)}`
    );

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

    const fRequired = requirement.isRequired ? '(required)' : '(optional)';
    this.logger?.debug?.(
      `Added a new requirement to the upgrade: ${f.highlight(requirement.name)} ${fRequired}`
    );

    return this;
  }

  async upgrade(): Promise<UpgradeReport> {
    this.logger?.info?.(
      `Upgrading from ${f.version(this.project.strapiVersion)} to ${f.version(this.target)}`
    );

    if (this.isDry) {
      this.logger?.warn?.(
        'Running the upgrade in dry mode. No files will be modified during the process.'
      );
    }

    const range = rangeFromVersions(this.project.strapiVersion, this.target);
    const codemodsRange = rangeFromVersions(this.project.strapiVersion, this.codemodsTarget);

    const npmVersionsMatches = this.npmPackage?.findVersionsInRange(range) ?? [];

    this.logger?.debug?.(
      `Found ${f.highlight(npmVersionsMatches.length)} versions satisfying ${f.versionRange(range)}`
    );

    try {
      this.logger?.info?.(f.upgradeStep('Checking requirement', [1, 4]));
      await this.checkRequirements(this.requirements, {
        npmVersionsMatches,
        project: this.project,
        target: this.target,
      });

      this.logger?.info?.(f.upgradeStep('Applying the latest code modifications', [2, 4]));
      await this.runCodemods(codemodsRange);

      // We need to refresh the project files to make sure we have
      // the latest version of each file (including package.json) for the next steps
      this.logger?.debug?.('Refreshing project information...');
      this.project.refresh();

      this.logger?.info?.(f.upgradeStep('Upgrading Strapi dependencies', [3, 4]));
      await this.updateDependencies();

      this.logger?.info?.(f.upgradeStep('Installing dependencies', [4, 4]));
      await this.installDependencies();
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

    this.logger?.warn?.(warningMessage);

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

    this.logger?.debug?.(
      `Found ${f.highlight(strapiDependencies.length)} dependency(ies) to update`
    );
    strapiDependencies.forEach((dependency) =>
      this.logger?.debug?.(`- ${dependency[0]} (${dependency[1]} -> ${this.target})`)
    );

    if (strapiDependencies.length === 0) {
      return;
    }

    strapiDependencies.forEach(([name]) => json.set(`dependencies.${name}`, this.target.raw));

    const updatedPackageJSON = json.root();

    if (this.isDry) {
      this.logger?.debug?.(`Skipping dependencies update (${chalk.italic('dry mode')})`);
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
      const isOnCurrentStrapiVersion = isValidSemVer(version) && version === strapiVersion.raw;

      if (isScopedStrapiPackage && isOnCurrentStrapiVersion) {
        strapiDependencies.push([name, semVerFactory(version)]);
      }
    }

    return strapiDependencies;
  }

  private async installDependencies(): Promise<void> {
    const projectPath = this.project.cwd;

    const packageManagerName = await packageManager.getPreferred(projectPath);

    this.logger?.debug?.(`Using ${f.highlight(packageManagerName)} as package manager`);

    if (this.isDry) {
      this.logger?.debug?.(`Skipping dependencies installation (${chalk.italic('dry mode')}`);
      return;
    }

    await packageManager.installDependencies(projectPath, packageManagerName, {
      stdout: this.logger?.stdout,
      stderr: this.logger?.stderr,
    });
  }

  private async runCodemods(range: Version.Range): Promise<void> {
    const codemodRunner = codemodRunnerFactory(this.project, range);
    codemodRunner.dry(this.isDry);
    if (this.logger) {
      codemodRunner.setLogger(this.logger);
    }
    await codemodRunner.run();
  }
}

/**
 * Resolves the NPM target version based on the given project, target, and NPM package.
 * If target is a SemVer, it directly finds it. If it's a release type (major, minor, patch),
 * it calculates the range of versions for this release type and returns the latest version within this range.
 */
const resolveNPMTarget = (
  project: AppProject,
  target: Version.ReleaseType | Version.SemVer,
  npmPackage: NPM.Package
): NPM.NPMPackageVersion | undefined => {
  // Semver
  if (isSemverInstance(target)) {
    return npmPackage.findVersion(target);
  }

  // Release Types
  if (isSemVerReleaseType(target)) {
    const range = rangeFromVersions(project.strapiVersion, target);
    const npmVersionsMatches = npmPackage.findVersionsInRange(range);

    // The targeted version is the latest one that matches the given range
    return npmVersionsMatches.at(-1);
  }

  return undefined;
};

export const upgraderFactory = (
  project: AppProject,
  target: Version.ReleaseType | Version.SemVer,
  npmPackage: NPM.Package
) => {
  const targetedNPMVersion = resolveNPMTarget(project, target, npmPackage);
  if (!targetedNPMVersion) {
    throw new Error(`Couldn't find a matching version in the NPM registry for "${target}"`);
  }

  const semverTarget = semVerFactory(targetedNPMVersion.version);

  if (semver.eq(semverTarget, project.strapiVersion)) {
    throw new Error(`The project is already on ${f.version(semverTarget)}`);
  }

  return new Upgrader(project, semverTarget, npmPackage);
};

const successReport = (): UpgradeReport => ({ success: true, error: null });
const erroredReport = (error: Error): UpgradeReport => ({ success: false, error });
