/**
 * The domain vocabulary of a draft release, in one place.
 *
 * GitHub payloads are described structurally by the fields this action actually reads, rather than
 * pulled in wholesale from Octokit. The adapters are the only place those payloads arrive, so a
 * narrow shape keeps every decision function checkable on its own.
 *
 * Every union that also exists at runtime is derived from its `as const` list, never written twice.
 */

/** Statuses an integration can end up with. */
export const ATTRIBUTION_STATUSES = [
  'resolved',
  'direct-integration',
  'ambiguous',
  'lookup-failed',
  'unresolved',
] as const;

export type AttributionStatus = (typeof ATTRIBUTION_STATUSES)[number];

/** The rule that decided an attribution. `none` means nothing decided it. */
export const ATTRIBUTION_BASES = [
  'exact-merge-sha',
  'verified-subject',
  'second-parent-head',
  'none',
] as const;

export type AttributionBasis = (typeof ATTRIBUTION_BASES)[number];

/** The only two increments this action produces. A major is always a hard stop. */
export const BUMP_KINDS = ['minor', 'patch'] as const;

export type BumpKind = (typeof BUMP_KINDS)[number];

/** Where the release version came from. */
export const VERSION_SOURCES = ['computed', 'version-input'] as const;

export type VersionSource = (typeof VERSION_SOURCES)[number];

/** Why an integration carries no product change of its own. */
export const IGNORE_REASONS = ['release-commit', 'back-merge', 'branch-merge'] as const;

export type IgnoreReason = (typeof IGNORE_REASONS)[number];

/** Every mutation the action can perform, as recorded in the write journal. */
export const JOURNAL_OPS = [
  'branch.push',
  'issue.milestone.clear',
  'issue.milestone.set',
  'milestone.close',
  'milestone.create',
  'milestone.rename',
  'pr.body',
  'pr.comment',
  'pr.create',
  'pr.label',
] as const;

export type JournalOp = (typeof JOURNAL_OPS)[number];

export const CLEANUP_ACTIONS = ['keep', 'move', 'clear'] as const;

export type CleanupAction = (typeof CLEANUP_ACTIONS)[number];

/** A stable `x.y.z` release version, parsed. */
export type StableVersion = {
  major: number;
  minor: number;
  patch: number;
};

/** One first-parent commit on the source branch. */
export type Integration = {
  sha: string;
  parents: string[];
  author: string;
  authoredAt: string;
  subject: string;
  body: string;
};

/** The fields of a GitHub pull request payload this action reads. */
export type PullPayload = {
  number: number;
  title?: string | null;
  html_url?: string | null;
  merged_at?: string | null;
  merge_commit_sha?: string | null;
  base?: { ref?: string | null } | null;
  head?: { ref?: string | null; sha?: string | null } | null;
  user?: { login?: string | null } | null;
  milestone?: { title?: string | null } | null;
};

/** The projection of a pull request that reaches the report. */
export type PullSummary = {
  number: number;
  title: string;
  author: string;
  url: string;
  baseRef: string;
  headRef: string;
  milestone: string | null;
};

/** One integration, decided. Always carries the rule that decided it. */
export type AttributionRecord = {
  sha: string;
  subject: string;
  author: string;
  authoredAt: string;
  parents: string[];
  status: AttributionStatus;
  basis: AttributionBasis;
  pull: PullSummary | null;
  warnings: string[];
  reason: string;
};

/** A pull request with every integration attributed to it. */
export type AttributedPull = PullSummary & {
  status: AttributionStatus;
  basis: AttributionBasis;
  integrationShas: string[];
};

/** A record a human still has to settle. */
export type AttentionRecord = {
  sha: string;
  subject: string;
  status: AttributionStatus;
  reason: string;
};

export type ConventionalHeader = {
  type: string;
  scope: string | null;
  breaking: boolean;
};

/** One integration voting for a bump, with the evidence that made it vote. */
export type BumpVote = {
  sha: string;
  pr: number | null;
  subject: string;
  via: 'subject' | 'pr-commits';
};

export type BumpClassification = {
  features: BumpVote[];
  breaking: BumpVote[];
  ignored: { sha: string; reason: IgnoreReason; subject: string }[];
  unparsed: { sha: string; pr: number | null; subject: string }[];
};

/** A GitHub milestone, as far as this action cares. */
export type Milestone = {
  number: number;
  title: string;
  state?: string;
};

export type MilestonePlan = {
  shipping: {
    action: 'create' | 'rename' | 'keep';
    number: number | null;
    currentTitle: string | null;
    title: string;
  };
  next: {
    action: 'create' | 'reuse';
    number: number | null;
    title: string;
  };
};

/** An issue or pull request carrying a milestone, as returned by the issues endpoint. */
export type MilestoneItem = {
  number: number;
  title?: string | null;
  state?: string;
  pull_request?: { merged_at?: string | null } | null;
};

export type CleanupItem = {
  number: number;
  title: string;
  kind: 'issue' | 'pull';
  action: CleanupAction;
  to: number | null;
  reason: string;
};

export type Reconciliation = {
  inHistoryNotInMilestone: number[];
  inMilestoneNotInHistory: number[];
};

/** What a mutation intends to do, before it is attempted. */
export type JournalIntent = {
  op: JournalOp;
  target: string;
  before?: string | null;
  after?: string | null;
  detail?: string | null;
};

export type JournalEntry = {
  op: JournalOp;
  target: string;
  before: string | null;
  after: string | null;
  detail: string | null;
  at: string;
  applied: boolean;
};

export type JournalSnapshot = {
  mode: 'applied' | 'planned';
  entries: JournalEntry[];
};

export type Journal = {
  mode: 'applied' | 'planned';
  /** Records the intent, then performs it only when the run is applying. */
  write: <T>(intent: JournalIntent, perform: () => Promise<T>) => Promise<T | null>;
  entries: () => JournalEntry[];
  toJSON: () => JournalSnapshot;
};

export type PinnedRange = {
  fromRef: string;
  fromSha: string;
  toRef: string;
  toSha: string;
};

/** The machine-readable payload embedded in the release pull request body. */
export type ReleasePayload = {
  schemaVersion: number;
  generatedAt: string;
  repository: string;
  dryRun: boolean;
  release: {
    version: string;
    bump: BumpKind;
    previousVersion: string;
    source: VersionSource;
  };
  range: PinnedRange & { integrationCount: number };
  /** What later automation needs to find this candidate again, without re-deriving any of it. */
  candidate: {
    /** The release branch this candidate lives on, e.g. `releases/5.53.0`. */
    branch: string;
    /** The pinned commit the branch was cut at. Same value as `range.toSha`. */
    headSha: string;
    /** The artifact `publish-pr-experimental.yml` publishes from `headSha`. */
    expectedExperimentalVersion: string;
    /** The release pull request, `null` on a dry run where no pull request is created. */
    pullRequestNumber: number | null;
    pullRequestUrl: string | null;
  };
  bumpEvidence: {
    featureIntegrations: BumpVote[];
    breakingIntegrations: BumpVote[];
    ignored: BumpClassification['ignored'];
    unparsed: BumpClassification['unparsed'];
  };
  pullRequests: AttributedPull[];
  attention: AttentionRecord[];
  milestones: {
    shipping: {
      number: number | null;
      title: string;
      renamedFrom: string | null;
      state: 'closed';
    };
    next: {
      number: number | null;
      title: string;
      created: boolean;
    };
  };
  reconciliation: Reconciliation;
};

export type RepositoryMergeSettings = {
  allow_merge_commit?: boolean;
  allow_squash_merge?: boolean;
  allow_rebase_merge?: boolean;
};

export type RepositoryCoords = {
  owner: string;
  repo: string;
};

/** One commit inside a pull request, as returned by the pull commits endpoint. */
export type PullCommit = {
  commit?: { message?: string | null } | null;
};

/** The result of a shell command. The exec surface never throws; the adapter decides. */
export type ExecResult = {
  status: number;
  stdout: string;
  stderr: string;
};

export type GitExec = (args: string[]) => ExecResult;

export type GitAdapter = {
  resolveSha: (ref: string) => string;
  refExists: (ref: string) => boolean;
  isAncestor: (ancestor: string, descendant: string) => boolean;
  listIntegrations: (fromSha: string, toSha: string) => Integration[];
  pushBranch: (sha: string, branch: string) => void;
  remoteBranchExists: (branch: string) => boolean;
};

export type GithubAdapter = {
  coords: RepositoryCoords;
  getRepository: () => Promise<RepositoryMergeSettings>;
  listPullsForCommit: (sha: string) => Promise<PullPayload[]>;
  getPull: (pullNumber: number) => Promise<PullPayload>;
  listPullCommits: (pullNumber: number) => Promise<PullCommit[]>;
  listMilestones: (state: 'open' | 'closed' | 'all') => Promise<Milestone[]>;
  createMilestone: (title: string) => Promise<Milestone>;
  updateMilestone: (
    milestoneNumber: number,
    patch: { title?: string; state?: 'open' | 'closed' }
  ) => Promise<Milestone>;
  listMilestoneItems: (milestoneNumber: number) => Promise<MilestoneItem[]>;
  setIssueMilestone: (issueNumber: number, milestoneNumber: number | null) => Promise<void>;
  createPull: (input: {
    head: string;
    base: string;
    title: string;
    body: string;
  }) => Promise<{ number: number; html_url?: string | null }>;
  updatePullBody: (pullNumber: number, body: string) => Promise<void>;
  addLabels: (issueNumber: number, labels: string[]) => Promise<void>;
  createComment: (issueNumber: number, body: string) => Promise<void>;
};

/** The commit-to-pull lookups the resolver needs, narrowed from the full adapter. */
export type AttributionLookup = Pick<GithubAdapter, 'listPullsForCommit' | 'getPull'>;

export type Logger = {
  info: (message: string) => void;
};

export type Clock = () => string;

export type DraftReleaseInputs = {
  version: string;
  dryRun: boolean;
  sourceRef: string;
};
