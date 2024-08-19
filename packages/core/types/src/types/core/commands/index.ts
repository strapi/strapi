import { Command } from 'commander';

export type AddCommandOptions = {
  command: Command;
  argv: Record<number, string>;
};
