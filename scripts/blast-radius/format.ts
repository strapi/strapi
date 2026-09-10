import type { BlastRadiusResultV2, ChangedFile, PathEvidence, Radius } from './types';
import { compareCodePoints, sortCodePoints } from './ordering';

const sort = (values: readonly string[]) => sortCodePoints(values);
const compare = <T extends { path: string }>(left: T, right: T) =>
  compareCodePoints(left.path, right.path);
export const radiusDefinition = {
  metric: 'dependency-reach' as const,
  description:
    'Dependency reach only; excludes dynamic runtime completeness, correctness, coverage, security criticality, AI confidence, and merge eligibility.',
  tiers: {
    NON_RUNTIME: { affectedProjects: 0 },
    SINGLE_PACKAGE: { affectedProjects: 1 },
    MULTI_PACKAGE: { minAffectedProjects: 2, maxAffectedProjects: 5 },
    WIDE: { minAffectedProjects: 6, maxAffectedFractionExclusive: 0.5 },
    REPOSITORY: { minAffectedFractionInclusive: 0.5, repositoryGlobalPathForcesTier: true },
  },
};
export function createResult(input: {
  context: {
    repository: string;
    pullRequest: number;
    mergeRevision: string;
    baseRevision: string;
    headRevision: string;
  };
  changes: {
    files: Array<Omit<ChangedFile, 'status'> & { status: string }>;
    additions: number;
    deletions: number;
    binaryFileCount: number;
  };
  totalProjects: string[];
  prWideProjects: string[];
  semanticProjects: string[];
  fallbackPaths: string[];
  affectedProjects: string[];
  pathEvidence: Array<Omit<PathEvidence, 'decision'> & { decision: string }>;
  radius: string;
  sensitivitySignals: string[];
  reasons: string[];
  warnings: string[];
}): BlastRadiusResultV2 {
  const affectedProjects = sort(input.affectedProjects);
  if (input.context.repository !== 'strapi/strapi') throw new Error('Unsupported repository.');
  return {
    schemaVersion: 2,
    classifierVersion: 2,
    repository: input.context.repository,
    pullRequest: input.context.pullRequest,
    mergeRevision: input.context.mergeRevision,
    baseRevision: input.context.baseRevision,
    headRevision: input.context.headRevision,
    changedFiles: [...input.changes.files].sort(compare) as ChangedFile[],
    additions: input.changes.additions,
    deletions: input.changes.deletions,
    binaryFileCount: input.changes.binaryFileCount,
    totalProjects: sort(input.totalProjects),
    prWideProjects: sort(input.prWideProjects),
    semanticProjects: sort(input.semanticProjects),
    fallbackPaths: sort(input.fallbackPaths),
    affectedProjectCount: affectedProjects.length,
    affectedProjects,
    pathEvidence: [...input.pathEvidence].sort(compare).map((item) => ({
      ...item,
      decision: item.decision as PathEvidence['decision'],
      nxProjects: sort(item.nxProjects),
      semanticProjects: sort(item.semanticProjects),
      finalProjects: sort(item.finalProjects),
      reasonCodes: sort(item.reasonCodes),
      declarations: [...item.declarations].sort(
        (a, b) => compareCodePoints(a.path, b.path) || a.offset - b.offset
      ),
      references: [...item.references].sort(
        (a, b) => compareCodePoints(a.path, b.path) || a.offset - b.offset
      ),
    })),
    radius: input.radius as Radius,
    radiusDefinition,
    sensitivitySignals: sort(input.sensitivitySignals),
    reasons: sort(input.reasons),
    warnings: sort(input.warnings),
  };
}
export const renderJson = (result: BlastRadiusResultV2) => `${JSON.stringify(result)}\n`;

const control = (character: string) => {
  if (character === '\n') return '\\n';
  if (character === '\r') return '\\r';
  if (character === '\t') return '\\t';
  return `\\u${character.codePointAt(0)!.toString(16).padStart(4, '0')}`;
};

const safeText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/[\p{Cc}\p{Cf}\u{2028}\u{2029}]/gu, control)
    .replace(/```/g, '\\`\\`\\`')
    .replace(/[#[\]{}()*_<>|!]/g, '\\$&');

const signalLabel = (signal: string) => {
  const words = signal.replace(/[-_]/g, ' ');
  return words ? `${words[0]!.toUpperCase()}${words.slice(1)}` : words;
};

const list = (values: readonly string[], transform: (value: string) => string = safeText) =>
  values.length ? values.map((value) => `- ${transform(value)}`).join('\n') : 'None';

const evidenceCounts = (result: BlastRadiusResultV2) => ({
  narrowed: result.pathEvidence.filter((evidence) => evidence.decision === 'narrowed').length,
  fallback: result.pathEvidence.filter((evidence) => evidence.decision === 'nx-fallback').length,
  nonRuntime: result.pathEvidence.filter((evidence) => evidence.decision === 'non-runtime').length,
});

function report(result: BlastRadiusResultV2, markdown: boolean): string {
  const evidence = evidenceCounts(result);
  const section = (title: string) => (markdown ? `### ${title}` : title);
  const lines = [
    markdown ? '## Blast radius (advisory)' : 'Blast radius (advisory)',
    '',
    `PR: ${safeText(result.repository)}#${result.pullRequest}`,
    `Merge revision: ${safeText(result.mergeRevision.slice(0, 7))}`,
    `Base revision: ${safeText(result.baseRevision.slice(0, 7))}`,
    `Head revision: ${safeText(result.headRevision.slice(0, 7))}`,
    `Blast radius: ${result.radius}`,
    `Classifier version: ${result.classifierVersion}`,
    '',
    `Changed files: ${result.changedFiles.length}`,
    `Additions/deletions: +${result.additions}/-${result.deletions}`,
    `Nx-bounded static reach: ${result.affectedProjectCount}/${result.totalProjects.length}`,
    `Nx upper bound: ${result.prWideProjects.length}/${result.totalProjects.length}`,
    '',
    section('Affected projects'),
    list(result.affectedProjects),
    '',
    section('Sensitivity signals'),
    list(result.sensitivitySignals, (signal) => safeText(signalLabel(signal))),
    '',
    section('Reasons'),
    list(result.reasons),
    '',
    section('Fallback paths'),
    list(result.fallbackPaths),
    '',
    section('Path evidence'),
    `Narrowed: ${evidence.narrowed}`,
    `Fallback: ${evidence.fallback}`,
    `Non-runtime: ${evidence.nonRuntime}`,
    '',
    section('Warnings'),
    list(result.warnings),
    '',
    section('Changed paths'),
    list(result.changedFiles.map((file) => `${file.status}: ${file.path}`)),
    '',
    'Advisory only: analysis uses the PR merge checkout and static source evidence; it is not dynamic runtime completeness, merge eligibility, correctness, coverage, or a privileged decision.',
    '',
  ];
  return lines.join('\n');
}

export const renderHuman = (result: BlastRadiusResultV2) => report(result, false);
export const renderMarkdown = (result: BlastRadiusResultV2) => report(result, true);
