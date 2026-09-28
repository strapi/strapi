import type {
  AttributionRecord,
  BumpClassification,
  BumpKind,
  BumpVote,
  ConventionalHeader,
  IgnoreReason,
  Integration,
  PullCommit,
} from './types.ts';

/**
 * Decides the release increment from what actually landed in the pinned range.
 *
 * The rule is deliberately small:
 *
 *   any breaking marker -> stop
 *   any `feat`          -> minor
 *   otherwise           -> patch
 *
 * `enhancement`, `future`, `security`, `fix`, `chore`, `ci`, `docs`, `test` and `revert` never
 * force a minor.
 */

const CONVENTIONAL_SUBJECT =
  /^(?<type>[a-zA-Z][a-zA-Z0-9]*)(?:\((?<scope>[^)]*)\))?(?<breaking>!)?:[ \t]*(?<description>.*)$/u;

const BREAKING_FOOTER = /^BREAKING[ -]CHANGE[ \t]*:/mu;

const BRANCH_MERGE_SUBJECT = /^Merge (?:remote-tracking )?branch '[^']+'(?: into .+)?$/u;

export const FEATURE_TYPE = 'feat';

/** Types whose integration is bookkeeping for a release that already happened. */
export const IGNORED_TYPES: ReadonlySet<string> = new Set(['release']);

/** Head branches that carry commits which already shipped. */
export const BACK_MERGE_HEAD_REFS = /^(?:main|releases\/)/u;

/** Parses a conventional commit header. Returns `null` for anything that is not one. */
export function parseConventionalSubject(subject: string): ConventionalHeader | null {
  const match = CONVENTIONAL_SUBJECT.exec((subject ?? '').trim());

  if (match === null || match.groups === undefined) {
    return null;
  }

  return {
    type: (match.groups['type'] ?? '').toLowerCase(),
    scope: match.groups['scope'] ?? null,
    breaking: match.groups['breaking'] === '!',
  };
}

/** Detects an anchored `BREAKING CHANGE:` footer, not a mention of the phrase in prose. */
export function hasBreakingFooter(body: string): boolean {
  return BREAKING_FOOTER.test(body ?? '');
}

/**
 * Explains why an integration carries no product change of its own.
 *
 * Back-merges matter most. `chore: release v5.52.3 update develop` is a pull request whose head is
 * `main`, and its commits are the previous release's commits. Counting them would let an already
 * shipped `feat` vote for a second minor.
 *
 * @returns `null` when the integration does carry product change.
 */
export function ignoreReason(
  integration: Pick<Integration, 'subject'>,
  record: Pick<AttributionRecord, 'pull'>
): IgnoreReason | null {
  const header = parseConventionalSubject(integration.subject);

  if (header !== null && IGNORED_TYPES.has(header.type) === true) {
    return 'release-commit';
  }

  if (record.pull !== null && BACK_MERGE_HEAD_REFS.test(record.pull.headRef) === true) {
    return 'back-merge';
  }

  if (record.pull === null && BRANCH_MERGE_SUBJECT.test(integration.subject) === true) {
    return 'branch-merge';
  }

  return null;
}

/**
 * Reads conventional headers out of the commits inside a pull request.
 *
 * This is the correction the rule needs. commitlint runs `--from base.sha --to head.sha`, so it
 * validates the commits inside a pull request, never the squash subject that lands on the base
 * branch. Subjects such as `Feat/e2e critical ctb add fields (#26559)` therefore reach the base
 * branch unparsed, and only the pull request's own commits are gated.
 */
export function readPullCommitHeaders(commits: readonly PullCommit[]): {
  headers: ConventionalHeader[];
  breaking: boolean;
} {
  return (commits ?? []).reduce<{ headers: ConventionalHeader[]; breaking: boolean }>(
    (accumulator, entry) => {
      const message = entry?.commit?.message ?? '';
      const [subject = '', ...rest] = message.split('\n');
      const header = parseConventionalSubject(subject);

      return {
        headers: header === null ? accumulator.headers : [...accumulator.headers, header],
        breaking:
          accumulator.breaking ||
          (header !== null && header.breaking === true) ||
          hasBreakingFooter(rest.join('\n')),
      };
    },
    { headers: [], breaking: false }
  );
}

/** What one integration contributes to the bump decision. */
type IntegrationVerdict =
  | { kind: 'ignored'; entry: BumpClassification['ignored'][number] }
  | { kind: 'unparsed'; entry: BumpClassification['unparsed'][number] }
  | { kind: 'classified'; feature: BumpVote | null; breaking: BumpVote | null };

function vote(integration: Integration, pr: number | null, via: BumpVote['via']): BumpVote {
  return { sha: integration.sha, pr, subject: integration.subject, via };
}

async function classifyOne(
  integration: Integration,
  record: Pick<AttributionRecord, 'pull'>,
  listPullCommits: (pullNumber: number) => Promise<PullCommit[]>
): Promise<IntegrationVerdict> {
  const skip = ignoreReason(integration, record);

  if (skip !== null) {
    return {
      kind: 'ignored',
      entry: { sha: integration.sha, reason: skip, subject: integration.subject },
    };
  }

  const prNumber = record.pull?.number ?? null;
  const header = parseConventionalSubject(integration.subject);

  // The landing commit's own body is breaking evidence whatever its subject parses to, so it is
  // read on every path below rather than only the one where the subject happened to parse.
  //
  // A squash body is where a breaking footer most often ends up. commitlint validates the commits
  // inside a pull request, never the squash subject, and GitHub pre-fills the merge box from those
  // commits, so a subject can read `Feat/new upload flow (#123)` while the body carries the footer
  // and the inner commits stay `feat:`.
  const landingBreak = hasBreakingFooter(integration.body)
    ? vote(integration, prNumber, 'landing-body')
    : null;

  if (header !== null) {
    return {
      kind: 'classified',
      feature: header.type === FEATURE_TYPE ? vote(integration, prNumber, 'subject') : null,
      breaking: header.breaking === true ? vote(integration, prNumber, 'subject') : landingBreak,
    };
  }

  // An unparsed subject leaves the type unknown. It is not a reason to drop a breaking marker:
  // reporting one as `unparsed` would let the range cut a release with a break in it.
  if (prNumber === null) {
    return landingBreak === null
      ? {
          kind: 'unparsed',
          entry: { sha: integration.sha, pr: null, subject: integration.subject },
        }
      : { kind: 'classified', feature: null, breaking: landingBreak };
  }

  const { headers, breaking } = readPullCommitHeaders(await listPullCommits(prNumber));
  const anyBreak = breaking === true ? vote(integration, prNumber, 'pr-commits') : landingBreak;

  if (headers.length === 0) {
    return anyBreak === null
      ? {
          kind: 'unparsed',
          entry: { sha: integration.sha, pr: prNumber, subject: integration.subject },
        }
      : { kind: 'classified', feature: null, breaking: anyBreak };
  }

  return {
    kind: 'classified',
    feature: headers.some((entry) => entry.type === FEATURE_TYPE)
      ? vote(integration, prNumber, 'pr-commits')
      : null,
    breaking: anyBreak,
  };
}

function fold(accumulator: BumpClassification, verdict: IntegrationVerdict): BumpClassification {
  switch (verdict.kind) {
    case 'ignored':
      return { ...accumulator, ignored: [...accumulator.ignored, verdict.entry] };
    case 'unparsed':
      return { ...accumulator, unparsed: [...accumulator.unparsed, verdict.entry] };
    case 'classified':
      return {
        ...accumulator,
        features:
          verdict.feature === null
            ? accumulator.features
            : [...accumulator.features, verdict.feature],
        breaking:
          verdict.breaking === null
            ? accumulator.breaking
            : [...accumulator.breaking, verdict.breaking],
      };
    default: {
      const exhaustive: never = verdict;

      return exhaustive;
    }
  }
}

/** Classifies every integration in the range, keeping the evidence behind each vote. */
export async function classifyIntegrations(
  integrations: readonly Integration[],
  records: readonly Pick<AttributionRecord, 'sha' | 'pull'>[],
  listPullCommits: (pullNumber: number) => Promise<PullCommit[]>
): Promise<BumpClassification> {
  const recordBySha = new Map(records.map((record) => [record.sha, record]));
  const verdicts: IntegrationVerdict[] = [];

  // Sequential on purpose: the fallback issues one API call per unparsed subject.
  for (const integration of integrations) {
    const record = recordBySha.get(integration.sha) ?? { pull: null };
    verdicts.push(await classifyOne(integration, record, listPullCommits));
  }

  return verdicts.reduce<BumpClassification>(fold, {
    features: [],
    breaking: [],
    ignored: [],
    unparsed: [],
  });
}

/** Applies the rule. A breaking change is a hard stop, never an automatic major. */
export function decideBump(classification: BumpClassification): BumpKind {
  if (classification.breaking.length > 0) {
    const listed = classification.breaking.map((entry) => entry.sha.slice(0, 8)).join(', ');

    throw new Error(
      `The range carries a breaking change (${listed}). This action never proposes a major on the ` +
        'v5 line. Decide the version by hand and pass it with the `version` input.'
    );
  }

  return classification.features.length > 0 ? 'minor' : 'patch';
}
