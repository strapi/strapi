import type { Version } from '../modules/version';
import type { MaybePromise } from '../types';

// CLI

// Common Options

// Logging
type DebugOption = { debug: boolean };
type SilentOption = { silent: boolean };

// Behavior
type YesOption = { yes?: boolean };

// Configuration
type DryOption = { dry: boolean };
type RangeOption = { range?: Version.Range };
type ProjectPathOption = { projectPath?: string };

// "<release> Upgrade" options
export type CLIUpgradeOptions = DebugOption &
  SilentOption &
  ProjectPathOption &
  YesOption &
  DryOption;

// "Upgrade To" options
export type CLIUpgradeToOptions = CLIUpgradeOptions & {
  codemodsTarget?: Version.SemVer;
};

// Codemods
type CommonCodemodsOptions = DebugOption & SilentOption & ProjectPathOption;

// "codemods run [uid]" options
export type CLIRunCodemodsOptions = CommonCodemodsOptions & RangeOption & DryOption;

// "codemods ls" options
export type CLIListCodemodsOptions = CommonCodemodsOptions & RangeOption;

// COMMANDS

// Upgrade Command Options
export interface UpgradeCommandOptions extends CLIUpgradeOptions {
  target: Version.ReleaseType | Version.SemVer;
  codemodsTarget?: Version.SemVer;
}

// Codemods Commands Options
export type ListCodemodsCommandOptions = CLIListCodemodsOptions;
export type RunCodemodsCommandOptions = CLIRunCodemodsOptions & { uid: string | undefined };

export type Command<TOptions extends object> = (options: TOptions) => MaybePromise<void>;

// Upgrade Commands
export type UpgradeCommand = Command<UpgradeCommandOptions>;

// Codemods Commands
export type RunCodemodsCommand = Command<RunCodemodsCommandOptions>;
export type ListCodemodsCommand = Command<ListCodemodsCommandOptions>;
