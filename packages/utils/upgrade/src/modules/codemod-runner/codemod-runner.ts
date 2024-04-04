import { groupBy, size } from 'lodash/fp';

import {
  codemodRepositoryFactory,
  constants as codemodRepositoryConstants,
} from '../codemod-repository';
import { unknownToError } from '../error';
import { semVerFactory } from '../version';
import * as f from '../format';

import type { Codemod } from '../codemod';
import type { Logger } from '../logger';
import type { Project } from '../project';
import type { UpgradeReport } from '../upgrader';
import type { CodemodRunnerInterface, CodemodRunnerReport, SelectCodemodsCallback } from './types';
import type { Version } from '../version';

export class CodemodRunner implements CodemodRunnerInterface {
  private readonly project: Project;

  private range: Version.Range;

  private isDry: boolean;

  private logger: Logger | null;

  private selectCodemodsCallback: SelectCodemodsCallback | null;

  constructor(project: Project, range: Version.Range) {
    this.project = project;
    this.range = range;

    this.isDry = false;

    this.logger = null;
    this.selectCodemodsCallback = null;
  }

  setRange(range: Version.Range) {
    this.range = range;
    return this;
  }

  setLogger(logger: Logger) {
    this.logger = logger;
    return this;
  }

  onSelectCodemods(callback: SelectCodemodsCallback | null) {
    this.selectCodemodsCallback = callback;
    return this;
  }

  dry(enabled: boolean = true) {
    this.isDry = enabled;
    return this;
  }

  private createRepository(codemodsDirectory?: string) {
    const repository = codemodRepositoryFactory(
      codemodsDirectory ?? codemodRepositoryConstants.INTERNAL_CODEMODS_DIRECTORY
    );

    // Make sure we have access to the latest snapshots of codemods on the system
    repository.refresh();

    return repository;
  }

  private async safeRunAndReport(codemods: Codemod.List) {
    if (this.isDry) {
      this.logger?.warn?.(
        'Running the codemods in dry mode. No files will be modified during the process.'
      );
    }

    try {
      const reports = await this.project.runCodemods(codemods, { dry: this.isDry });

      this.logger?.raw?.(f.reports(reports));

      if (!this.isDry) {
        const nbAffectedTotal = reports
          .flatMap((report) => report.report.ok)
          .reduce((acc, nb) => acc + nb, 0);

        this.logger?.debug?.(
          `Successfully ran ${f.highlight(codemods.length)} codemod(s), ${f.highlight(nbAffectedTotal)} change(s) have been detected`
        );
      }

      return successReport();
    } catch (e: unknown) {
      return erroredReport(unknownToError(e));
    }
  }

  async runByUID(uid: string, codemodsDirectory?: string): Promise<CodemodRunnerReport> {
    const repository = this.createRepository(codemodsDirectory);

    if (!repository.has(uid)) {
      throw new Error(`Unknown codemod UID provided: ${uid}`);
    }

    // Note: Ignore the range when running with a UID
    const codemods = repository.find({ uids: [uid] }).flatMap(({ codemods }) => codemods);

    return this.safeRunAndReport(codemods);
  }

  async run(codemodsDirectory?: string): Promise<CodemodRunnerReport> {
    const repository = this.createRepository(codemodsDirectory);

    // Find codemods matching the given range
    const codemodsInRange = repository.find({ range: this.range });

    // If a selection callback is set, use it, else keep every codemods found
    const selectedCodemods = this.selectCodemodsCallback
      ? await this.selectCodemodsCallback(codemodsInRange)
      : codemodsInRange;

    // If no codemods have been selected (either manually or automatically)
    // Then ignore and return a successful report
    if (selectedCodemods.length === 0) {
      this.logger?.debug?.(`Found no codemods to run for ${f.versionRange(this.range)}`);
      return successReport();
    }

    // Flatten the collection to a single list of codemods, the original list should already be sorted by version
    const codemods = selectedCodemods.flatMap(({ codemods }) => codemods);

    // Log (debug) the codemods by version
    const codemodsByVersion = groupBy('version', codemods);
    const fRange = f.versionRange(this.range);

    this.logger?.debug?.(
      `Found ${f.highlight(codemods.length)} codemods for ${f.highlight(size(codemodsByVersion))} version(s) using ${fRange}`
    );

    for (const [version, codemods] of Object.entries(codemodsByVersion)) {
      this.logger?.debug?.(`- ${f.version(semVerFactory(version))} (${codemods.length})`);
    }

    return this.safeRunAndReport(codemods);
  }
}

export const codemodRunnerFactory = (project: Project, range: Version.Range) => {
  return new CodemodRunner(project, range);
};

const successReport = (): UpgradeReport => ({ success: true, error: null });
const erroredReport = (error: Error): UpgradeReport => ({ success: false, error });
