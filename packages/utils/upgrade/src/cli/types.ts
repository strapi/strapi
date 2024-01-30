import type { Version } from '../modules/version';
import type { MaybePromise } from '../types';

// CLI

type DryOption = { dry: boolean };
type DebugOption = { debug: boolean };
type SilentOption = { silent: boolean };
type YesOption = { yes?: boolean };
type ProjectPathOption = { projectPath?: string };

export type CLIUpgradeOptions = DryOption &
  DebugOption &
  SilentOption &
  YesOption &
  ProjectPathOption;

export type CLIUpgradeToOptions = CLIUpgradeOptions & {
  codemodsTarget?: Version.SemVer;
};

export type CLICodemodsOptions = DryOption & DebugOption & SilentOption & ProjectPathOption;

// COMMANDS OPTIONS

export interface UpgradeCommandOptions extends CLIUpgradeOptions {
  target: Version.ReleaseType | Version.SemVer;
  codemodsTarget?: Version.SemVer;
}

export interface CodemodsCommandOptions extends CLICodemodsOptions {}

// COMMANDS

export type Command<TOptions extends object> = (options: TOptions) => MaybePromise<void>;

export type UpgradeCommand = Command<UpgradeCommandOptions>;
export type CodemodsCommand = Command<CodemodsCommandOptions>;
