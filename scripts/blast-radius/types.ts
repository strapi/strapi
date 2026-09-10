export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed';

export type ChangedFile = {
  path: string;
  previousPath?: string;
  status: FileStatus;
  additions: number | null;
  deletions: number | null;
  binary: boolean;
};

export type CommandRequest = {
  executable: string;
  args: readonly string[];
  cwd?: string;
  env?: Readonly<Record<string, string>>;
};
export type CommandResult = { stdout: string | Buffer; stderr: string | Buffer };
export type CommandRunner = (request: CommandRequest) => Promise<CommandResult>;

export type ActionContext = {
  repository: 'strapi/strapi';
  pullRequest: number;
  mergeRevision: string;
  baseRevision: string;
  headRevision: string;
};

export type Radius = 'NON_RUNTIME' | 'SINGLE_PACKAGE' | 'MULTI_PACKAGE' | 'WIDE' | 'REPOSITORY';

export type PathEvidence = {
  path: string;
  decision: 'non-runtime' | 'repository-global' | 'narrowed' | 'nx-fallback';
  nxProjects: string[];
  semanticProjects: string[];
  finalProjects: string[];
  reasonCodes: string[];
  declarations: Array<{ path: string; name: string; offset: number }>;
  references: Array<{ path: string; project: string; offset: number }>;
};

export type BlastRadiusResultV2 = {
  schemaVersion: 2;
  classifierVersion: 2;
  repository: 'strapi/strapi';
  pullRequest: number;
  mergeRevision: string;
  baseRevision: string;
  headRevision: string;
  changedFiles: ChangedFile[];
  additions: number;
  deletions: number;
  binaryFileCount: number;
  totalProjects: string[];
  prWideProjects: string[];
  semanticProjects: string[];
  fallbackPaths: string[];
  affectedProjectCount: number;
  affectedProjects: string[];
  pathEvidence: PathEvidence[];
  radius: Radius;
  radiusDefinition: {
    metric: 'dependency-reach';
    description: string;
    tiers: Record<string, object>;
  };
  sensitivitySignals: string[];
  reasons: string[];
  warnings: string[];
};
