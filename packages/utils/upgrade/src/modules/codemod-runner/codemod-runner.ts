import {
  codemodRepositoryFactory,
  constants as codemodRepositoryConstants,
} from '../codemod-repository';
import { unknownToError } from '../error';
import * as f from '../format';

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

  async run(codemodsDirectory?: string): Promise<CodemodRunnerReport> {
    const repository = codemodRepositoryFactory(
      codemodsDirectory ?? codemodRepositoryConstants.INTERNAL_CODEMODS_DIRECTORY
    );

    // Make sure we have access to the latest snapshots of codemods on the system
    repository.refresh();

    const allVersionedCodemods = repository.findByRange(this.range);

    // If a selection callback is set, use it, else keep every codemods
    const versionedCodemods = this.selectCodemodsCallback
      ? await this.selectCodemodsCallback(allVersionedCodemods)
      : allVersionedCodemods;

    const hasCodemodsToRun = versionedCodemods.length > 0;

    if (!hasCodemodsToRun) {
      this.logger?.debug(`Found no codemods to run for ${f.versionRange(this.range)}`);
      return successReport();
    }

    this.logger?.debug(
      `Found codemods for ${f.highlight(
        versionedCodemods.length
      )} version(s) using ${f.versionRange(this.range)}`
    );
    versionedCodemods.forEach(({ version, codemods }) =>
      this.logger?.debug(`- ${f.version(version)} (${codemods.length})`)
    );

    // Flatten the collection to a single list of codemods, the original list should already be sorted
    const codemods = versionedCodemods.map(({ codemods }) => codemods).flat();

    try {
      const reports = await this.project.runCodemods(codemods, { dry: this.isDry });
      this.logger?.raw(f.reports(reports));
    } catch (e: unknown) {
      return erroredReport(unknownToError(e));
    }

    return successReport();
  }
}

export const codemodRunnerFactory = (project: Project, range: Version.Range) => {
  return new CodemodRunner(project, range);
};

const successReport = (): UpgradeReport => ({ success: true, error: null });
const erroredReport = (error: Error): UpgradeReport => ({ success: false, error });
