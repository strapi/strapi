import type { BlastRadiusResultV1, ChangedFile, PullRequestSnapshot, Radius } from './types';

const unique = (values: readonly string[]) => [...new Set(values)].sort();
const compareCodePoints = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;
const files = (values: readonly ChangedFile[]) =>
  [...values].sort(
    (a, b) =>
      compareCodePoints(a.path, b.path) ||
      compareCodePoints(a.previousPath ?? '', b.previousPath ?? '') ||
      compareCodePoints(a.status, b.status)
  );
export const radiusDefinition = {
  metric: 'dependency-reach' as const,
  description:
    'Dependency reach only; excludes correctness, test coverage, security criticality, and AI confidence.',
  tiers: {
    NON_RUNTIME: { affectedProjects: 0, requiresRecognizedNonRuntimePaths: true },
    LOCAL: { minAffectedProjects: 1, maxAffectedProjects: 1 },
    FEATURE: { minAffectedProjects: 2, maxAffectedProjects: 5 },
    WIDE: { minAffectedProjects: 6, maxAffectedFractionExclusive: 0.5 },
    REPOSITORY: { minAffectedFractionInclusive: 0.5, repositoryGlobalPathForcesTier: true },
    UNKNOWN: { successfulClassification: false },
  },
};
export function createResult(input: {
  snapshot: PullRequestSnapshot;
  workspaceRevision: string;
  radius: Radius;
  reasons: readonly string[];
  affectedProjects: readonly string[];
  totalProjects: number;
  sensitivitySignals: readonly string[];
}): BlastRadiusResultV1 {
  const prRevision = input.snapshot.head.sha.toLowerCase();
  const workspaceRevision = input.workspaceRevision.toLowerCase();
  const affectedProjects = unique(input.affectedProjects);
  return {
    schemaVersion: 1,
    classifierVersion: 1,
    repository: 'strapi/strapi',
    pullRequest: {
      number: input.snapshot.number,
      state: input.snapshot.state,
      merged: input.snapshot.merged,
      base: { branch: input.snapshot.base.branch, sha: input.snapshot.base.sha.toLowerCase() },
      head: { sha: prRevision },
      reportedChangedFileCount: input.snapshot.changedFiles,
    },
    prRevision,
    workspaceRevision,
    radius: input.radius,
    radiusDefinition,
    changedFiles: files(input.snapshot.files),
    additions: input.snapshot.additions,
    deletions: input.snapshot.deletions,
    affectedProjectCount: affectedProjects.length,
    totalProjectCount: input.totalProjects,
    affectedProjects,
    sensitivitySignals: unique(input.sensitivitySignals),
    reasons: unique(input.reasons),
    warnings: unique([
      `PR metadata and changed paths come from GitHub at ${prRevision}; affected projects come from the current checkout's Nx graph at ${workspaceRevision}.`,
      'Workspace revision identifies the checked-out commit; uncommitted local graph-configuration changes, if any, are not represented by that hash.',
    ]),
  };
}
export const renderJson = (result: unknown) => `${JSON.stringify(result)}\n`;

const signalLabels: Record<string, string> = {
  authentication: 'Authentication',
  permissions: 'Permissions',
  migrations: 'Migrations',
  'database-persistence': 'Database and persistence',
  'public-types': 'Public types',
  'release-tooling': 'Release tooling',
  'shared-test-infrastructure': 'Shared test infrastructure',
  'workflow-changes': 'Workflow changes',
};

const shortRevision = (revision: string) => revision.slice(0, 7);
const plural = (count: number, singular: string) => `${count} ${singular}${count === 1 ? '' : 's'}`;
const signalLabel = (signal: string) =>
  signalLabels[signal] ??
  signal
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');

function displayText(value: string): string {
  return [...value]
    .map((character) => {
      const codePoint = character.codePointAt(0);
      if (
        codePoint !== undefined &&
        (/[\p{Cc}\p{Cf}]/u.test(character) || codePoint === 0x2028 || codePoint === 0x2029)
      ) {
        return `\\u${codePoint.toString(16).padStart(4, '0')}`;
      }
      return character;
    })
    .join('');
}

function markdownText(value: string): string {
  return [...value]
    .map((character) => {
      const codePoint = character.codePointAt(0);
      if (
        codePoint !== undefined &&
        (/[\p{Cc}\p{Cf}]/u.test(character) || codePoint === 0x2028 || codePoint === 0x2029)
      ) {
        return `\\u${codePoint.toString(16).padStart(4, '0')}`;
      }
      if (character === '&') return '&amp;';
      if (character === '<') return '&lt;';
      if (character === '>') return '&gt;';
      if (character === '`') return '&#96;';
      if ('\\!#()*+-.[\\]_{}|~'.includes(character)) return `\\${character}`;
      return character;
    })
    .join('');
}

function renderList(
  values: readonly string[],
  transform: (value: string) => string = (value) => value
) {
  return values.length ? values.map((value) => `- ${transform(value)}`).join('\n') : '- None';
}

function overview(result: BlastRadiusResultV1): string {
  return `${result.affectedProjectCount} of ${result.totalProjectCount} projects affected\n${plural(
    result.changedFiles.length,
    'file'
  )} changed · +${result.additions} / -${result.deletions}`;
}

function analysisBasis(result: BlastRadiusResultV1): string {
  return `- GitHub PR revision: ${shortRevision(result.prRevision)}\n- Current checkout Nx graph: ${shortRevision(result.workspaceRevision)}\n- Note: Uncommitted local graph-configuration changes are not represented by this hash.`;
}

export function renderHuman(result: BlastRadiusResultV1): string {
  return `PR ${displayText(result.repository)}#${result.pullRequest.number} — ${displayText(result.radius)}\n\n${overview(result)}\n\nAffected projects\n${renderList(result.affectedProjects, displayText)}\n\nSensitivity signals\n${renderList(result.sensitivitySignals, (signal) => displayText(signalLabel(signal)))}\n\nWhy this tier\n${renderList(result.reasons, displayText)}\n\nAnalysis basis\n${analysisBasis(result)}\n\nClassifier version: ${result.classifierVersion}\n`;
}

export function renderMarkdown(result: BlastRadiusResultV1): string {
  const projectList = renderList(result.affectedProjects, markdownText);
  const sensitivityList = renderList(result.sensitivitySignals, (signal) =>
    markdownText(signalLabel(signal))
  );
  const reasons = renderList(result.reasons, markdownText);
  return `## PR ${markdownText(result.repository)}#${result.pullRequest.number} — ${markdownText(result.radius)}\n\n> Advisory only: generated by code from the pull request checkout. Do not use this result for permissions, merge eligibility, or privileged automation.\n\n${overview(result)}\n\nAffected projects\n\n${projectList}\n\nSensitivity signals\n\n${sensitivityList}\n\nWhy this tier\n\n${reasons}\n\nAnalysis basis\n\n- GitHub PR revision: ${markdownText(shortRevision(result.prRevision))}\n- Current checkout Nx graph: ${markdownText(shortRevision(result.workspaceRevision))}\n- Note: Uncommitted local graph\\-configuration changes are not represented by this hash.\n\nClassifier version: ${result.classifierVersion}\n`;
}
