import type { Command } from 'commander';
import { Logger } from './utils/logger';
import { TsConfig } from './utils/tsconfig';

export interface CLIContext {
  cwd: string;
  logger: Logger;
  tsconfig?: TsConfig;
}

export type StrapiCommand = (params: {
  command: Command;
  argv: string[];
  ctx: CLIContext;
}) => void | Command | Promise<void | Command>;
