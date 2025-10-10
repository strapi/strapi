import type { NPM } from '../npm';
import type { AppProject } from '../project';
import type { Version } from '../version';
import type { Requirement } from '../requirement';
import type { Logger } from '../logger';
import type { ConfirmationCallback } from '../common/types';

export interface Upgrader {
  getNPMPackage(): NPM.Package;
  getProject(): AppProject;
  getTarget(): Version.SemVer;

  setTarget(target: Version.SemVer): this;
  setRequirements(requirements: Requirement.Requirement[]): this;
  setLogger(logger: Logger): this;

  overrideCodemodsTarget(target: Version.SemVer): this;
  syncCodemodsTarget(): this;

  dry(enabled?: boolean): this;
  onConfirm(callback: ConfirmationCallback | null): this;

  confirm(message: string): Promise<boolean>;

  addRequirement(requirement: Requirement.Requirement): this;

  upgrade(): Promise<UpgradeReport>;
}

export type UpgradeReport =
  | {
      success: true;
      error: null;
    }
  | { success: false; error: Error };
