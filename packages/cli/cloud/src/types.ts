import type { Command } from 'commander';
import type { DistinctQuestion } from 'inquirer';
import { Logger } from './services/logger';

export type ProjectAnswers = {
  name: string;
  nodeVersion: string;
  region: string;
  plan: string;
};

type BoxedErrorMessage = {
  firstLine: string;
  secondLine: string;
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
    userChoice?: object;
    reference?: string;
    errors: {
      environmentCreationFailed: BoxedErrorMessage;
    };
  };
  projectDeployment: {
    confirmationText: string;
    errors: {
      environmentNotReady: BoxedErrorMessage;
    };
  };
  buildLogsConnectionTimeout: string;
  buildLogsMaxRetries: string;
  notificationsConnectionTimeout: string;
  maxProjectFileSize: string;
  featureFlags: {
    cloudLoginPromptEnabled: boolean;
    growthSsoTrialEnabled: boolean;
    asyncProjectCreationEnabled: boolean;
  };
};

export interface CLIContext {
  cwd: string;
  logger: Logger;
  promptExperiment?: string;
  user?: User;
}

export type User = {
  id: string;
};

export type StrapiCloudCommand = (params: {
  command: Command;
  argv: string[];
  ctx: CLIContext;
}) => void | Command | Promise<Command | void>;

export type StrapiCloudNamespaceCommand = (params: {
  command: Command;
}) => void | Command | Promise<Command | void>;

export type StrapiCloudCommandInfo = {
  name: string;
  description: string;
  command: StrapiCloudCommand;
  action: (ctx: CLIContext, options?: Record<string, unknown>) => Promise<unknown>;
};

export type TrackPayload = Record<string, unknown>;

// eslint-disable-next-line import/no-cycle
export type * from './services/cli-api';
