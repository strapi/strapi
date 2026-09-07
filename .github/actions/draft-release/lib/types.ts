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
  'branch.delete',
  'branch.push',
  'issue.milestone.clear',
  'issue.milestone.set',
  'milestone.close',
  'milestone.create',
  'milestone.rename',
  'pr.body',
  'pr.close',
  'pr.comment',
  'pr.create',
  'pr.label',
] as const;

export type JournalOp = (typeof JOURNAL_OPS)[number];

/**
 * How far a recorded mutation got.
 *
 * `failed` and `indeterminate` are deliberately separate. A run that dies halfway is finished by
 * hand, and the person doing it needs to know the difference between a write the server refused and
 * a write whose outcome nobody can vouch for.
 */
export const JOURNAL_ENTRY_STATES = [
  'planned',
  'attempted',
  'applied',
  'failed',
  'indeterminate',
] as const;

export type JournalEntryState = (typeof JOURNAL_ENTRY_STATES)[number];

/**
 * What a run does with the release candidate.
 *
 * `draft` opens one, `refresh` advances the one in flight, and `redraft` replaces it because the
 * version it was cut under no longer matches what landed.
 */
export const RELEASE_MODES = ['draft', 'refresh', 'redraft'] as const;

export type ReleaseMode = (typeof RELEASE_MODES)[number];

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
  /** The git author name, `%an`. On a squash commit this is the contributor's display name. */
  author: string;
  /** The git author email, `%ae`. Never leaves this action: it is evidence, not payload. */
  email: string;
  authoredAt: string;
  subject: string;
  body: string;
};

/**
 * Who wrote a pull request.
 *
 * A GitHub pull request payload only ever carries a login. Its `user` is the short user object,
 * which has no display name in it, and asking for one costs a request per distinct contributor.
 * Git already has the name: a squash commit is authored by the contributor, so `%an` on the
 * integration commit is the same string GitHub renders next to it.
 *
 * The email that comes with it is deliberately not part of this type. It is read to decide whether
 * the name can be trusted, and then dropped, because the payload is published in a public pull
 * request body and a work address does not belong there.
 */
export type Author = {
  /** The GitHub username. Empty only when the pull request payload carries no user. */
  login: string;
  /** The display name, `null` when no commit in the range can vouch for one. */
  name: string | null;
};

/** The fields of a GitHub pull request payload this action reads. */
export type PullPayload = {
  number: number;
  title?: string | null;
  html_url?: string | null;
  body?: string | null;
  merged_at?: string | null;
  merge_commit_sha?: string | null;
  base?: { ref?: string | null } | null;
  head?: {
    ref?: string | null;
    sha?: string | null;
    /** `null` when the head repository was deleted, which only a fork can be. */
    repo?: { full_name?: string | null } | null;
  } | null;
  user?: { login?: string | null } | null;
  milestone?: { title?: string | null } | null;
};

/** A pull request the API reports as merged, produced only by the `isMerged` guard. */
export type MergedPull = PullPayload & { merged_at: string };

/** The projection of a pull request that reaches the report. */
export type PullSummary = {
  number: number;
  title: string;
  author: Author;
  url: string;
  baseRef: string;
  headRef: string;
  milestone: string | null;
  /**
   * When the pull request landed, ISO 8601, from `merged_at`.
   *
   * Always a real timestamp: a summary is only ever projected from a {@link MergedPull}, which is
   * the type the `isMerged` guard produces, so the payload cannot have arrived without one.
   */
  mergedAt: string;
};

/** One integration, decided. Always carries the rule that decided it. */
export type AttributionRecord = {
  sha: string;
  subject: string;
  /** The commit's own git author name, not the pull request's. `pull.author` is that one. */
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

/**
 * Where the evidence behind a bump vote was read.
 *
 * `landing-body` is the body of the first-parent commit itself, which is the only place a breaking
 * footer can be found when the subject does not parse as a conventional header.
 */
export const BUMP_VOTE_SOURCES = ['subject', 'pr-commits', 'landing-body'] as const;

export type BumpVoteSource = (typeof BUMP_VOTE_SOURCES)[number];

/** One integration voting for a bump, with the evidence that made it vote. */
export type BumpVote = {
  sha: string;
  pr: number | null;
  subject: string;
  via: BumpVoteSource;
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

/**
 * One milestone the run has to end up with, and how it gets there.
 *
 * `number` and `currentTitle` are `null` only with `create`, where the milestone does not exist
 * until the run applies.
 */
export type MilestoneTarget = {
  action: 'create' | 'keep' | 'rename';
  number: number | null;
  currentTitle: string | null;
  title: string;
};

export type MilestonePlan = {
  shipping: MilestoneTarget & {
    /**
     * Whether the run still has to close it.
     *
     * `false` on a refresh, where the milestone was already closed by the run that drafted the
     * candidate. A closed milestone still accepts item assignments through the REST API, which is
     * what lets a refresh keep filling it without reopening it first.
     */
    close: boolean;
  };
  next: MilestoneTarget;
};

/**
 * A pull request whose milestone disagrees with what history says.
 *
 * History is the authority: a pull request merged inside the range ships in this release whatever
 * milestone its author picked, so the milestone is corrected rather than obeyed.
 */
export type RealignItem = {
  number: number;
  from: string | null;
  toTitle: string;
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
  state: JournalEntryState;
  /** The failure that stopped this write, `null` while it has not failed. */
  error: string | null;
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

/**
 * A release candidate already in flight, discovered from its open pull request.
 *
 * The pull request is the only artifact whose lifecycle matches the candidate's, and only one whose
 * head lives in this repository qualifies. A release branch
 * outlives it, because the ruleset that protects release branches forbids deleting them without a
 * bypass, and a milestone is renamed by this very action.
 */
export type Candidate = {
  /** The version the candidate was cut under, as its branch name spells it. */
  version: string;
  /** The same version parsed once, because the branch pattern already proved it is `x.y.z`. */
  parsedVersion: StableVersion;
  branch: string;
  pullNumber: number;
  pullUrl: string;
};

/**
 * Everything the run decided, before it wrote anything.
 *
 * Producing this is the only phase allowed to refuse. Once a plan exists, every remaining step is a
 * write, so a refusal can never leave the repository half-changed.
 */
export type ReleasePlan = {
  mode: ReleaseMode;
  candidate: Candidate | null;
  previousVersion: string;
  version: string;
  bumpKind: BumpKind;
  classification: BumpClassification;
  versionSource: VersionSource;
  range: PinnedRange;
  integrationCount: number;
  pullRequests: AttributedPull[];
  attention: AttentionRecord[];
  warnings: string[];
  milestones: MilestonePlan;
  branch: string;
  /** `false` when the branch already points at the pinned head, so nothing has to be pushed. */
  branchAdvances: boolean;
  /**
   * The head git resolved for the candidate's branch during preflight, `null` without a candidate.
   *
   * A redraft deletes that branch under a lease on this value, so a commit pushed to it after the
   * preflight fails the delete instead of being lost.
   */
  candidateHeadSha: string | null;
  realignment: RealignItem[];
};

/**
 * What the writes produced that the plan could not know.
 *
 * The numbers GitHub assigned to whatever this run created, and the milestone drift read once the
 * realignment had run. Every field is `null` on a dry run that would have created the thing.
 */
export type ReleaseOutcome = {
  shippingNumber: number | null;
  nextNumber: number | null;
  pullNumber: number | null;
  pullUrl: string | null;
  reconciliation: Reconciliation;
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
    /** Whether this run opened the candidate, advanced it, or replaced it. */
    mode: ReleaseMode;
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
    /**
     * Whether this run moved the branch.
     *
     * `false` when the branch already pointed at the pinned head, which means the experimental
     * artifact a reader may already have tested is still the current one.
     */
    branchAdvanced: boolean;
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
  /** Deletes under a lease: the push fails unless the remote head is still `expectedSha`. */
  deleteBranch: (branch: string, expectedSha: string) => void;
  remoteBranchExists: (branch: string) => boolean;
  /** Brings a remote branch into `refs/remotes/origin`, so a guard never rests on how the
   * workflow's checkout was configured. */
  fetchBranch: (branch: string) => void;
};

export type GithubAdapter = {
  coords: RepositoryCoords;
  getRepository: () => Promise<RepositoryMergeSettings>;
  listPullsForCommit: (sha: string) => Promise<PullPayload[]>;
  getPull: (pullNumber: number) => Promise<PullPayload>;
  listPulls: (input: { state: 'open' | 'closed' | 'all'; base: string }) => Promise<PullPayload[]>;
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
  closePull: (pullNumber: number) => Promise<void>;
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
};
