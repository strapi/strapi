import type { Command } from 'commander';
import type { DistinctQuestion } from 'inquirer';
import { Logger } from './services/logger';

export type ProjectAnswers = {
  name: string;
  nodeVersion: string;
  region: string;
  plan: string;
};

export type CloudCliConfig = {
  clientId: string;
  baseUrl: string;
  deviceCodeAuthUrl: string;
  audience: string;
  scope: string;
  tokenUrl: string;
  jwksUrl: string;
  projectCreation: {
    questions: ReadonlyArray<DistinctQuestion<ProjectAnswers>>;
    defaults: Partial<ProjectAnswers>;
    introText: string;
  };
  buildLogsConnectionTimeout: string;
  buildLogsMaxRetries: string;
  notificationsConnectionTimeout: string;
  maxProjectFileSize: string;
};

export interface CLIContext {
  cwd: string;
  logger: Logger;
}

export type StrapiCloudCommand = (params: {
  command: Command;
  argv: string[];
  ctx: CLIContext;
}) => void | Command | Promise<Command | void>;

export type StrapiCloudCommandInfo = {
  name: string;
  description: string;
  command: StrapiCloudCommand;
  action: (ctx: CLIContext) => Promise<unknown>;
};

export type TrackPayload = Record<string, unknown>;

export type * from './services/cli-api';
