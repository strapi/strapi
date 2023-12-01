import type { Version } from '../version';
import type { Requirement } from '../requirement';
import type { Logger } from '../logger';
import type { MaybePromise } from '../../types';
import type { NPM } from '../npm';

export interface Upgrader {
  setTarget(target: Version.ReleaseType | Version.SemVer): this;
  setRequirements(requirements: Requirement.Requirement[]): this;
  setLogger(logger: Logger): this;

  dry(enabled?: boolean): this;
  onConfirm(callback: ConfirmationCallback | null): this;

  addRequirement(requirement: Requirement.Requirement): this;

  upgrade(): Promise<UpgradeReport>;
}

export interface UpgradeReport {
  success: boolean;
  error?: Error;
}

export type ConfirmationCallback = (message: string) => MaybePromise<boolean>;
