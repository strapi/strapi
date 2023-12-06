import type { Version } from '../modules/version';
import type { MaybePromise } from '../types';

export interface CLIOptions {
  dry: boolean;
  debug: boolean;
  silent: boolean;

  projectPath?: string;
}

export interface CommandOptions extends CLIOptions {
  target: Version.ReleaseType;
}

export type Command = (options: CommandOptions) => MaybePromise<void>;
