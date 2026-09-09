import { readFile } from 'node:fs/promises';
import { renderMarkdown } from './format';
import type { BlastRadiusResultV1, Radius } from './types';

type ReadText = (path: string) => Promise<string>;
type SummaryOutcome = { exitCode: number; stdout: string; stderr: string };

const radii = new Set<Radius>(['NON_RUNTIME', 'LOCAL', 'FEATURE', 'WIDE', 'REPOSITORY']);
const fileStatuses = new Set(['added', 'removed', 'modified', 'renamed']);
const prRevisionPattern = /^[0-9a-f]{40}$/;
const workspaceRevisionPattern = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;
const isRepositoryPath = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  !value.startsWith('/') &&
  !value.includes('\\') &&
  !value.includes('\0') &&
  value.split('/').every((segment) => segment && segment !== '.' && segment !== '..');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isUniqueNonemptyStringArray(value: unknown): value is string[] {
  return (
    isStringArray(value) &&
    value.every((item) => item.length > 0) &&
    new Set(value).size === value.length
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isChangedFile(value: unknown): value is BlastRadiusResultV1['changedFiles'][number] {
  if (!isRecord(value) || !isRepositoryPath(value.path)) return false;
  if (typeof value.status !== 'string' || !fileStatuses.has(value.status)) return false;
  if (value.status === 'renamed')
    return isRepositoryPath(value.previousPath) && value.previousPath !== value.path;
  return value.previousPath === undefined;
}

function isUsableResult(value: unknown): value is BlastRadiusResultV1 {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.classifierVersion !== 1) return false;
  if (value.repository !== 'strapi/strapi' || !isRecord(value.pullRequest)) return false;
  if (!isNonNegativeInteger(value.pullRequest.number) || value.pullRequest.number === 0)
    return false;
  if (!isNonNegativeInteger(value.pullRequest.reportedChangedFileCount)) return false;
  if (typeof value.prRevision !== 'string' || !prRevisionPattern.test(value.prRevision))
    return false;
  if (
    typeof value.workspaceRevision !== 'string' ||
    !workspaceRevisionPattern.test(value.workspaceRevision)
  )
    return false;
  if (typeof value.radius !== 'string' || !radii.has(value.radius as Radius)) return false;
  if (!Array.isArray(value.changedFiles) || !value.changedFiles.every(isChangedFile)) return false;
  if (value.changedFiles.length !== value.pullRequest.reportedChangedFileCount) return false;
  if (new Set(value.changedFiles.map((file) => file.path)).size !== value.changedFiles.length)
    return false;
  if (!isNonNegativeInteger(value.additions) || !isNonNegativeInteger(value.deletions))
    return false;
  if (
    !isNonNegativeInteger(value.affectedProjectCount) ||
    !isNonNegativeInteger(value.totalProjectCount)
  )
    return false;
  if (value.totalProjectCount === 0 || value.affectedProjectCount > value.totalProjectCount)
    return false;
  if (!isUniqueNonemptyStringArray(value.affectedProjects)) return false;
  if (value.affectedProjectCount !== value.affectedProjects.length) return false;
  return (
    isStringArray(value.sensitivitySignals) &&
    isStringArray(value.reasons) &&
    isStringArray(value.warnings)
  );
}

export async function runSummary(
  argv: readonly string[],
  readText: ReadText = (path) => readFile(path, 'utf8')
): Promise<SummaryOutcome> {
  if (argv.length !== 1 || argv[0].length === 0) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'Usage: yarn tsx scripts/pr-blast-radius/summary.ts <result-json-path>\n',
    };
  }

  let text: string;
  try {
    text = await readText(argv[0]);
  } catch {
    return { exitCode: 1, stdout: '', stderr: 'Unable to read classifier JSON result.\n' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { exitCode: 1, stdout: '', stderr: 'Classifier result must be valid JSON.\n' };
  }

  if (!isUsableResult(parsed)) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'Classifier result is not structurally usable version-1 output.\n',
    };
  }

  return { exitCode: 0, stdout: renderMarkdown(parsed), stderr: '' };
}
