import type {
  AttentionRecord,
  AttributedPull,
  Author,
  BumpClassification,
  BumpKind,
  JournalEntry,
  PinnedRange,
  ReleasePayload,
  Reconciliation,
  RepositoryCoords,
  VersionSource,
} from './types.ts';

export const SCHEMA_VERSION = 4;
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

/** The shipping table, one row per attributed pull request. */
export function renderPullRequestTable(pullRequests: readonly AttributedPull[]): string {
  if (pullRequests.length === 0) {
    return '_No pull request resolved in this range._';
  }

  return table(
    ['PR', 'Title', 'Author', 'Milestone', 'Basis'],
    pullRequests.map(
      (pull) =>
        `| [#${pull.number}](${pull.url}) | ${cell(pull.title)} | ${renderAuthor(pull.author)} | ` +
        `${cell(pull.milestone ?? '—')} | ${cell(pull.basis)} |`
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

/** Every mutation, planned or applied, as a table. */
export function renderJournalTable(entries: readonly JournalEntry[]): string {
  if (entries.length === 0) {
    return '_No write recorded._';
  }

  return table(
    ['Operation', 'Target', 'Before', 'After'],
    entries.map(
      (entry) =>
        `| ${entry.op} | ${cell(entry.target)} | ${cell(entry.before ?? '—')} | ` +
        `${cell(entry.after ?? '—')} |`
    )
  );
}

export type PayloadInput = {
  generatedAt: string;
  coords: RepositoryCoords;
  dryRun: boolean;
  version: string;
  bump: BumpKind;
  previousVersion: string;
  versionSource: VersionSource;
  range: PinnedRange;
  integrationCount: number;
  branch: string;
  pullNumber: number | null;
  pullUrl: string | null;
  classification: BumpClassification;
  pullRequests: AttributedPull[];
  attention: AttentionRecord[];
  milestones: ReleasePayload['milestones'];
  reconciliation: Reconciliation;
};

/** Builds the machine-readable payload embedded in the pull request body. */
export function buildPayload(input: PayloadInput): ReleasePayload {
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: input.generatedAt,
    repository: `${input.coords.owner}/${input.coords.repo}`,
    dryRun: input.dryRun,
    release: {
      version: input.version,
      bump: input.bump,
      previousVersion: input.previousVersion,
      source: input.versionSource,
    },
    range: { ...input.range, integrationCount: input.integrationCount },
    candidate: {
      branch: input.branch,
      headSha: input.range.toSha,
      expectedExperimentalVersion: experimentalVersion(input.range.toSha),
      pullRequestNumber: input.pullNumber,
      pullRequestUrl: input.pullUrl,
    },
    bumpEvidence: {
      featureIntegrations: input.classification.features,
      breakingIntegrations: input.classification.breaking,
      ignored: input.classification.ignored,
      unparsed: input.classification.unparsed,
    },
    pullRequests: input.pullRequests,
    attention: input.attention,
    milestones: input.milestones,
    reconciliation: input.reconciliation,
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

function formatNumbers(numbers: readonly number[]): string {
  return numbers.length === 0 ? '_none_' : numbers.map((number) => `#${number}`).join(', ');
}

export type BodyInput = {
  payload: ReleasePayload;
  pullRequests: readonly AttributedPull[];
  attention: readonly AttentionRecord[];
  warnings?: readonly string[];
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
    table(
      ['', ''],
      [
        `| **Range** | \`${payload.range.fromRef}\` → \`${payload.range.toRef}\` |`,
        `| **From** | \`${payload.range.fromSha}\` |`,
        `| **To** | \`${payload.range.toSha}\` |`,
        `| **Integrations** | ${payload.range.integrationCount} |`,
        `| **Pull requests** | ${pullRequests.length} |`,
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

/** The single comment posted on the release pull request after the milestone work. */
export function renderMilestoneComment(input: {
  version: string;
  nextTitle: string;
  entries: readonly JournalEntry[];
  dryRun: boolean;
}): string {
  const milestoneEntries = input.entries.filter(
    (entry) => entry.op.startsWith('milestone.') === true || entry.op.startsWith('issue.') === true
  );

  return [
    `## Milestone reconciliation for ${input.version}`,
    '',
    input.dryRun === true
      ? `Dry run. Nothing below was applied. Work now collects in \`${input.nextTitle}\`.`
      : `\`${input.version}\` is closed. Work now collects in \`${input.nextTitle}\`.`,
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
    `# draft-release — ${payload.release.version} (${payload.release.bump})`,
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
