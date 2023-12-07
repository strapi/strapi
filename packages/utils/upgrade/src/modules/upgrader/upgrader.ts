import assert from 'node:assert';

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
  private project: Project;

  private npmPackage: NPM.Package;

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
    const range = rangeFromVersions(this.project.strapiVersion, this.target);
    const npmVersionsMatches = this.npmPackage?.findVersionsInRange(range) ?? [];

    try {
      await this.checkRequirements(this.requirements, {
        npmVersionsMatches,
        project: this.project,
        target: this.target,
      });

      await this.updateDependencies();

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
    const errorMessage = `Upgrade requirement "${requirement.name}" failed: ${originalError.message}`;
    const confirmationMessage = `Optional requirement "${requirement.name}" failed with "${originalError.message}", do you want to proceed anyway?`;

    const error = new Error(errorMessage);

    if (requirement.isRequired) {
      throw error;
    }

    const response = await this.confirmationCallback?.(confirmationMessage);

    if (!response) {
      throw error;
    }

    this.logger?.warn(errorMessage);
  }

  private async updateDependencies(): Promise<void> {
    const { packageJSON, packageJSONPath } = this.project;

    const json = createJSONTransformAPI(packageJSON);

    const dependencies = json.get<Record<string, string>>('dependencies', {});
    const strapiDependencies = this.getScopedStrapiDependencies(dependencies);

    if (strapiDependencies.length === 0) {
      return;
    }

    strapiDependencies.forEach(([name]) => json.set(`dependencies.${name}`, this.target.raw));

    const updatedPackageJSON = json.root();

    if (!this.isDry) {
      await saveJSON(packageJSONPath, updatedPackageJSON);
    }
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

  private async runCodemods(range: Version.Range) {
    const repository = codemodRepositoryFactory(
      codemodRepositoryConstants.INTERNAL_CODEMODS_DIRECTORY
    );

    // Make sure we have access to the latest snapshots of codemods on the system
    repository.refresh();

    const versionedCodemods = repository.findByRange(range);

    const hasCodemodsToRun = versionedCodemods.length > 0;
    if (!hasCodemodsToRun) {
      this.logger?.debug(`Found no codemods to run for ${this.target}`);
      return;
    }

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

  assert(targetedNPMVersion, `No available version found for ${range}`);

  // Make sure the latest version matched in the range is the same as the targeted one (only if target is a semver)
  if (isSemVer(target) && target.raw !== targetedNPMVersion.version) {
    throw new Error(
      `${target} doesn't exist on the registry. Closest one found is ${targetedNPMVersion.version}`
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
