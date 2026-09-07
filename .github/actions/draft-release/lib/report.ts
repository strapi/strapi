import type {
  AttentionRecord,
  AttributedPull,
  Author,
  JournalEntry,
  ReleaseMode,
  ReleaseOutcome,
  ReleasePayload,
  ReleasePlan,
  RepositoryCoords,
} from './types.ts';

export const SCHEMA_VERSION = 5;
export const BLOCK_START = '<!-- STRAPI_RELEASE_CANDIDATE_START -->';
export const BLOCK_END = '<!-- STRAPI_RELEASE_CANDIDATE_END -->';

const SHORT_SHA_LENGTH = 8;

/**
 * The version published from a pull request head by
 * [`publish-pr-experimental.yml`](../../workflows/publish-pr-experimental.yml), which versions on
 * `github.event.pull_request.head.sha`. Mirrored here so a consumer of the payload never has to
 * rebuild the scheme, and only ever from the full SHA the workflow itself uses.
 */
export function experimentalVersion(headSha: string): string {
  return `0.0.0-experimental.${headSha}`;
}

/**
 * Escapes the characters that would break out of a Markdown table cell.
 *
 * Backslashes go first, because the backslash is the escape character. Escaping the pipe of `a\|b`
 * without them yields `a\\|b`, which renders as a literal backslash followed by an unescaped pipe,
 * and the cell the value was meant to sit inside ends early.
 */
function cell(value: unknown): string {
  return String(value ?? '')
    .replace(/\\/gu, '\\\\')
    .replace(/\|/gu, '\\|')
    .replace(/[\r\n]+/gu, ' ')
    .trim();
}

function short(sha: string): string {
  return sha.slice(0, SHORT_SHA_LENGTH);
}

/**
 * Drops a trailing `(#N)` so a rendered reference is never printed twice.
 *
 * Some squash subjects on `develop` already carry the reference, and a few carry it twice.
 */
export function withoutTrailingReference(subject: string): string {
  return String(subject ?? '')
    .replace(/(?:\s*\(#\d+\))+\s*$/u, '')
    .trim();
}

function table(header: readonly string[], rows: readonly string[]): string {
  return [`| ${header.join(' | ')} |`, `| ${header.map(() => '---').join(' | ')} |`, ...rows].join(
    '\n'
  );
}

/**
 * An author, as one table cell.
 *
 * The login is the identity and is always rendered; the display name is only ever added in front of
 * it, so a row stays readable and linkable when git could not vouch for a name.
 */
export function renderAuthor(author: Author): string {
  const login = author.login === '' ? '_unknown_' : `@${cell(author.login)}`;

  return author.name === null ? login : `${cell(author.name)} (${login})`;
}

/**
 * The calendar day a pull request landed, from its ISO `merged_at`.
 *
 * The day is the whole point of the column: it answers which release window the work landed in.
 * The time of day is kept in the payload for anything that needs to order two merges.
 */
export function renderMergeDate(mergedAt: string): string {
  return /^(\d{4}-\d{2}-\d{2})/u.exec(mergedAt)?.[1] ?? '—';
}

/**
 * The shipping table, one row per attributed pull request.
 *
 * The milestone column is the one the author picked, read when the range was attributed. The run
 * then corrects it to the shipping milestone, so a value that disagrees with the release is the
 * interesting case rather than a mistake in the report.
 */
export function renderPullRequestTable(pullRequests: readonly AttributedPull[]): string {
  if (pullRequests.length === 0) {
    return '_No pull request resolved in this range._';
  }

  return table(
    ['PR', 'Title', 'Author', 'Merged', 'Milestone at merge', 'Basis'],
    pullRequests.map(
      (pull) =>
        `| [#${pull.number}](${pull.url}) | ${cell(pull.title)} | ${renderAuthor(pull.author)} | ` +
        `${renderMergeDate(pull.mergedAt)} | ${cell(pull.milestone ?? '—')} | ` +
        `${cell(pull.basis)} |`
    )
  );
}

/** The records a human still has to settle. Empty when everything resolved. */
export function renderAttentionTable(records: readonly AttentionRecord[]): string {
  if (records.length === 0) {
    return '';
  }

  return [
    '### Needs a human',
    '',
    table(
      ['Commit', 'Subject', 'Status', 'Why'],
      records.map(
        (record) =>
          `| \`${short(record.sha)}\` | ${cell(record.subject)} | ${record.status} | ` +
          `${cell(record.reason)} |`
      )
    ),
  ].join('\n');
}

/**
 * Every mutation, with how far it got.
 *
 * The state column is the point of the table. Only an `applied` entry is worth undoing, and an
 * `indeterminate` one is the entry somebody has to go and look at before touching anything.
 */
export function renderJournalTable(entries: readonly JournalEntry[]): string {
  if (entries.length === 0) {
    return '_No write recorded._';
  }

  return table(
    ['State', 'Operation', 'Target', 'Before', 'After'],
    entries.map(
      (entry) =>
        `| ${entry.state} | ${entry.op} | ${cell(entry.target)} | ${cell(entry.before ?? '—')} | ` +
        `${cell(entry.after ?? '—')} |`
    )
  );
}

/**
 * Builds the machine-readable payload embedded in the pull request body.
 *
 * Everything the plan decided is read from the plan; the outcome only adds what the writes
 * produced. Deriving the milestone section here keeps the payload shape the concern of one module.
 */
export function buildPayload(input: {
  plan: ReleasePlan;
  outcome: ReleaseOutcome;
  generatedAt: string;
  coords: RepositoryCoords;
  dryRun: boolean;
}): ReleasePayload {
  const { plan, outcome } = input;
  const { shipping, next } = plan.milestones;

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: input.generatedAt,
    repository: `${input.coords.owner}/${input.coords.repo}`,
    dryRun: input.dryRun,
    release: {
      version: plan.version,
      bump: plan.bumpKind,
      previousVersion: plan.previousVersion,
      source: plan.versionSource,
      mode: plan.mode,
    },
    range: { ...plan.range, integrationCount: plan.integrationCount },
    candidate: {
      branch: plan.branch,
      headSha: plan.range.toSha,
      expectedExperimentalVersion: experimentalVersion(plan.range.toSha),
      branchAdvanced: plan.branchAdvances,
      pullRequestNumber: outcome.pullNumber,
      pullRequestUrl: outcome.pullUrl,
    },
    bumpEvidence: {
      featureIntegrations: plan.classification.features,
      breakingIntegrations: plan.classification.breaking,
      ignored: plan.classification.ignored,
      unparsed: plan.classification.unparsed,
    },
    pullRequests: plan.pullRequests,
    attention: plan.attention,
    milestones: {
      shipping: {
        number: outcome.shippingNumber,
        title: shipping.title,
        renamedFrom: shipping.action === 'rename' ? shipping.currentTitle : null,
        state: 'closed',
      },
      next: {
        number: outcome.nextNumber,
        title: next.title,
        created: next.action === 'create',
      },
    },
    reconciliation: outcome.reconciliation,
  };
}

/** Wraps the payload in the markers later automation reads. */
export function renderJsonBlock(payload: ReleasePayload): string {
  return [BLOCK_START, '```json', JSON.stringify(payload, null, 2), '```', BLOCK_END].join('\n');
}

/**
 * Reads a payload back out of a pull request body.
 *
 * The markers exist so later automation does not have to parse prose.
 *
 * @returns `null` when the markers are absent or the block is not valid JSON.
 */
export function extractJsonBlock(body: string): unknown {
  const start = body.indexOf(BLOCK_START);
  const end = body.indexOf(BLOCK_END);

  if (start === -1 || end === -1 || end < start) {
    return null;
  }

  const inner = body.slice(start + BLOCK_START.length, end);
  const fenced = /```json\s*([\s\S]*?)```/u.exec(inner);

  if (fenced === null) {
    return null;
  }

  try {
    return JSON.parse(fenced[1] ?? '');
  } catch {
    return null;
  }
}

/**
 * What the run did to the candidate, in one sentence.
 *
 * A reader who opens the pull request a second time needs to know whether they are looking at a
 * fresh draft or at the same candidate carrying more work than it did an hour ago.
 */
const MODE_LINES: Record<ReleaseMode, string> = {
  draft: 'Drafted from `develop`.',
  refresh:
    'Refreshed. This candidate was already open, and it now covers everything that landed on ' +
    '`develop` since it was drafted.',
  redraft:
    'Redrafted. The commits that landed since changed the version, so this candidate replaces the ' +
    'one drafted before it.',
};

function formatNumbers(numbers: readonly number[]): string {
  return numbers.length === 0 ? '_none_' : numbers.map((number) => `#${number}`).join(', ');
}

export type BodyInput = {
  payload: ReleasePayload;
  pullRequests: readonly AttributedPull[];
  attention: readonly AttentionRecord[];
  warnings?: readonly string[];
  /** The candidate a redraft replaced, `null` on every other run. */
  supersedes?: { pullNumber: number; branch: string } | null;
};

/** The pull request body: a human summary, the shipping table, then the machine-readable block. */
export function renderBody(input: BodyInput): string {
  const { payload, pullRequests, attention } = input;
  const warnings = input.warnings ?? [];
  const decidedBy =
    payload.release.source === 'computed' ? 'the commits in the range' : 'the `version` input';

  const summary = [
    `# Release ${payload.release.version}`,
    '',
    `\`${payload.release.previousVersion}\` → \`${payload.release.version}\` ` +
      `(**${payload.release.bump}**, decided from ${decidedBy}).`,
    '',
    MODE_LINES[payload.release.mode],
    ...(input.supersedes === null || input.supersedes === undefined
      ? []
      : [
          '',
          `Supersedes #${input.supersedes.pullNumber}, which was drafted as ` +
            `\`${input.supersedes.branch}\`.`,
        ]),
    '',
    table(
      ['', ''],
      [
        `| **Range** | \`${payload.range.fromRef}\` → \`${payload.range.toRef}\` |`,
        `| **From** | \`${payload.range.fromSha}\` |`,
        `| **To** | \`${payload.range.toSha}\` |`,
        `| **Integrations** | ${payload.range.integrationCount} |`,
        `| **Pull requests** | ${pullRequests.length} |`,
        `| **Branch** | \`${payload.candidate.branch}\`, ` +
          `${payload.candidate.branchAdvanced === true ? 'advanced to the pinned head' : 'already at the pinned head'} |`,
        `| **Milestone** | ${payload.milestones.shipping.title} (closed) → ` +
          `${payload.milestones.next.title} |`,
      ]
    ),
    '',
    '## Shipping pull requests',
    '',
    renderPullRequestTable(pullRequests),
  ];

  const evidence =
    payload.bumpEvidence.featureIntegrations.length === 0
      ? []
      : [
          '',
          '## Why this is a minor',
          '',
          ...payload.bumpEvidence.featureIntegrations.map(
            (entry) =>
              `- \`${short(entry.sha)}\` ${cell(withoutTrailingReference(entry.subject))}` +
              `${entry.pr === null ? '' : ` (#${entry.pr})`} — via ${entry.via}`
          ),
        ];

  const { inHistoryNotInMilestone, inMilestoneNotInHistory } = payload.reconciliation;
  const drift =
    inHistoryNotInMilestone.length === 0 && inMilestoneNotInHistory.length === 0
      ? []
      : [
          '',
          '## Milestone reconciliation',
          '',
          `- In history, not in the milestone: ${formatNumbers(inHistoryNotInMilestone)}`,
          `- Merged in the milestone, not in this range: ${formatNumbers(inMilestoneNotInHistory)}`,
        ];

  const needsHuman = attention.length === 0 ? [] : ['', renderAttentionTable(attention)];
  const warned =
    warnings.length === 0
      ? []
      : ['', '### Warnings', '', ...warnings.map((warning) => `- ${warning}`)];

  return [
    ...summary,
    ...evidence,
    ...drift,
    ...needsHuman,
    ...warned,
    '',
    renderJsonBlock(payload),
    '',
  ].join('\n');
}

/**
 * The comment posted on the release pull request after the milestone work.
 *
 * One comment per run, never rewritten. The body of the pull request is the current truth and gets
 * replaced wholesale; these comments are the only record of which run pulled which work in.
 */
export function renderMilestoneComment(input: {
  version: string;
  nextTitle: string;
  mode: ReleaseMode;
  entries: readonly JournalEntry[];
  dryRun: boolean;
}): string {
  const milestoneEntries = input.entries.filter(
    (entry) => entry.op.startsWith('milestone.') === true || entry.op.startsWith('issue.') === true
  );

  const applied = {
    draft: `\`${input.version}\` is closed. Work now collects in \`${input.nextTitle}\`.`,
    refresh:
      `\`${input.version}\` stays closed and now carries everything that landed since the last ` +
      `run. Work continues to collect in \`${input.nextTitle}\`.`,
    redraft:
      `The candidate is now \`${input.version}\`, and its milestone is closed. Work collects in ` +
      `\`${input.nextTitle}\`.`,
  }[input.mode];

  return [
    `## Milestone reconciliation for ${input.version}`,
    '',
    input.dryRun === true
      ? `Dry run. Nothing below was applied. Work now collects in \`${input.nextTitle}\`.`
      : applied,
    '',
    renderJournalTable(milestoneEntries),
  ].join('\n');
}

/** The Actions step summary, which is the whole report when the run is a dry run. */
export function renderStepSummary(input: {
  payload: ReleasePayload;
  entries: readonly JournalEntry[];
}): string {
  const { payload, entries } = input;
  const mode = payload.dryRun === true ? 'Dry run' : 'Applied';
  const heading = payload.dryRun === true ? 'Planned' : 'Applied';

  return [
    `# draft-release — ${payload.release.version} (${payload.release.bump}, ${payload.release.mode})`,
    '',
    `${mode}. Baseline \`${payload.release.previousVersion}\`, range \`${payload.range.fromRef}\` → ` +
      `\`${short(payload.range.toSha)}\`, ${payload.range.integrationCount} integrations, ` +
      `${payload.pullRequests.length} pull requests.`,
    '',
    `## ${heading} writes`,
    '',
    renderJournalTable(entries),
    '',
    '## Shipping pull requests',
    '',
    renderPullRequestTable(payload.pullRequests),
  ].join('\n');
}
