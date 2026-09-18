import { readFile } from 'node:fs/promises';
import { renderMarkdown } from './format';
import type { BlastRadiusResultV2 } from './types';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
const nonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const radii = new Set(['NON_RUNTIME', 'SINGLE_PACKAGE', 'MULTI_PACKAGE', 'WIDE', 'REPOSITORY']);
function usable(value: unknown): value is BlastRadiusResultV2 {
  if (!record(value) || value.schemaVersion !== 2 || value.classifierVersion !== 2) return false;
  if (
    value.repository !== 'strapi/strapi' ||
    !nonNegative(value.pullRequest) ||
    value.pullRequest === 0 ||
    typeof value.mergeRevision !== 'string' ||
    !/^[a-f\d]{40}$/i.test(value.mergeRevision) ||
    typeof value.baseRevision !== 'string' ||
    !/^[a-f\d]{40}$/i.test(value.baseRevision) ||
    typeof value.headRevision !== 'string' ||
    !/^[a-f\d]{40}$/i.test(value.headRevision) ||
    !Array.isArray(value.changedFiles) ||
    !nonNegative(value.additions) ||
    !nonNegative(value.deletions) ||
    !nonNegative(value.binaryFileCount) ||
    !strings(value.totalProjects) ||
    !strings(value.prWideProjects) ||
    !strings(value.semanticProjects) ||
    !strings(value.fallbackPaths) ||
    !nonNegative(value.affectedProjectCount) ||
    !strings(value.affectedProjects) ||
    value.affectedProjectCount !== value.affectedProjects.length ||
    !Array.isArray(value.pathEvidence) ||
    typeof value.radius !== 'string' ||
    !radii.has(value.radius) ||
    !record(value.radiusDefinition) ||
    !strings(value.sensitivitySignals) ||
    !strings(value.reasons) ||
    !strings(value.warnings)
  )
    return false;
  return value.changedFiles.every(
    (file) => record(file) && typeof file.path === 'string' && typeof file.status === 'string'
  );
}
export async function runSummary(
  argv: readonly string[],
  reader: (path: string) => Promise<string> = (path) => readFile(path, 'utf8')
) {
  if (argv.length !== 1 || !argv[0])
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'Usage: yarn tsx scripts/blast-radius/summary.ts <result-json-path>\n',
    };
  try {
    const result: unknown = JSON.parse(await reader(argv[0]));
    if (!usable(result)) throw new Error();
    return { exitCode: 0, stdout: renderMarkdown(result as BlastRadiusResultV2), stderr: '' };
  } catch {
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'Classifier result is not structurally usable version-2 output.\n',
    };
  }
}
if (process.argv[1]?.endsWith('summary.ts'))
  void runSummary(process.argv.slice(2)).then((outcome) => {
    if (outcome.stdout) process.stdout.write(outcome.stdout);
    if (outcome.stderr) process.stderr.write(outcome.stderr);
    process.exitCode = outcome.exitCode;
  });
