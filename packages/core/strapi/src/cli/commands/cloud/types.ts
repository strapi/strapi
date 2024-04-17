import type { DistinctQuestion } from 'inquirer';

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
  };
};

export type ProjectAnswers = {
  name: string;
  nodeVersion: string;
  region: string;
  plan: string;
};
