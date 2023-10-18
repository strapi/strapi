import type { Command } from 'commander';
import { Strapi } from '@strapi/types';
import { Logger } from './utils/logger';
import { TsConfig } from './utils/tsconfig';

export interface CLIContext {
  cwd: string;
  logger: Logger;
  strapi: Strapi;
  tsconfig?: TsConfig;
}

export type StrapiCommand = (params: { command: Command; argv: string[]; ctx: CLIContext }) => void;
