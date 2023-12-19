import type { Version } from '../version';
import type { Requirement } from '../requirement';
import type { Logger } from '../logger';
import { ConfirmationCallback } from '../common/types';

export interface Upgrader {
  setTarget(target: Version.ReleaseType | Version.SemVer): this;
  setRequirements(requirements: Requirement.Requirement[]): this;
  setLogger(logger: Logger): this;

  dry(enabled?: boolean): this;
  onConfirm(callback: ConfirmationCallback | null): this;

  addRequirement(requirement: Requirement.Requirement): this;

  upgrade(): Promise<UpgradeReport>;
}

export type UpgradeReport =
  | {
      success: true;
      error: null;
    }
  | { success: false; error: Error };
