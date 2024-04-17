import type { DistinctQuestion } from 'inquirer';

export type CloudCliConfig = {
  clientId: string;
  baseUrl: string;
  deviceCodeAuthUrl: string;
  audience: string;
  scope: string;
  tokenUrl: string;
  jwksUrl: string;
  projectQuestions: ReadonlyArray<DistinctQuestion<ProjectAnswers>>;
};

export type ProjectAnswers = {
  name: string;
  nodeVersion: '18' | '20';
  region: 'AMS' | 'NYC';
};
