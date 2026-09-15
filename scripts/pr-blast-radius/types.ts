export type FileStatus = 'added' | 'removed' | 'modified' | 'renamed';
export type ChangedFile = { path: string; status: FileStatus; previousPath?: string };
export type CommandRequest = {
  executable: string;
  args: readonly string[];
  cwd: string;
  env?: Readonly<Record<string, string>>;
};
export type CommandResult = { stdout: string; stderr: string };
export type CommandRunner = (request: CommandRequest) => Promise<CommandResult>;
export type PullRequestSnapshot = {
  number: number;
  state: 'open' | 'closed';
  merged: boolean;
  base: { branch: string; sha: string };
  head: { sha: string };
  additions: number;
  deletions: number;
  changedFiles: number;
  files: ChangedFile[];
};
export type Radius = 'NON_RUNTIME' | 'LOCAL' | 'FEATURE' | 'WIDE' | 'REPOSITORY';
export type BlastRadiusResultV1 = {
  schemaVersion: 1;
  classifierVersion: 1;
  repository: 'strapi/strapi';
  pullRequest: {
    number: number;
    state: 'open' | 'closed';
    merged: boolean;
    base: { branch: string; sha: string };
    head: { sha: string };
    reportedChangedFileCount: number;
  };
  prRevision: string;
  workspaceRevision: string;
  radius: Radius;
  radiusDefinition: {
    metric: 'dependency-reach';
    description: string;
    tiers: Record<string, object>;
  };
  changedFiles: ChangedFile[];
  additions: number;
  deletions: number;
  affectedProjectCount: number;
  totalProjectCount: number;
  affectedProjects: string[];
  sensitivitySignals: string[];
  reasons: string[];
  warnings: string[];
};
