import type { Command } from 'commander';
import type { Logger } from './utils/logger';
import type { TsConfig } from './utils/tsconfig';

export interface CLIContext {
  cwd: string;
  logger: Logger;
  tsconfig?: TsConfig;
}

export type StrapiCommand = (params: { command: Command; argv: string[]; ctx: CLIContext }) => void;
