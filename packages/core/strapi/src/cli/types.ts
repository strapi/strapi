import type { Command } from 'commander';
import { Logger } from './utils/logger';

export interface CLIContext {
  cwd: string;
  logger: Logger;
}

export type StrapiCommand = (params: {
  command: Command;
  argv: string[];
  ctx: CLIContext;
}) => void | Command | Promise<void | Command>;
