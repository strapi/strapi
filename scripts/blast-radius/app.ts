import { validateActionContext } from './action-context';
import { classify } from './classifier';
import { parseCliArgs } from './cli';
import { BlastRadiusError, ExitCode } from './errors';
import { createResult, renderHuman, renderJson } from './format';
import { changedRanges, readMergeChanges } from './git-changes';
import { analyzeNxUpperBounds } from './nx';
import { analysisPaths, globalCategories, isNonRuntimePath, sensitivitySignals } from './paths';
import { narrowWithTypeScript } from './semantic';
import {
  loadWorkspaceSources,
  type WorkspaceSourceLoader,
  type WorkspaceSourceResult,
} from './sources';
import type { CommandRunner, PathEvidence } from './types';

export type AppOutcome = { exitCode: number; stdout: string; stderr: string };
const isSourceResult = (
  value: Record<string, string> | WorkspaceSourceResult
): value is WorkspaceSourceResult =>
  'complete' in value &&
  typeof value.complete === 'boolean' &&
  'files' in value &&
  typeof value.files === 'object';
export async function run(
  argv: readonly string[],
  dependencies: {
    runner: CommandRunner;
    env?: Readonly<Record<string, string | undefined>>;
    readEvent?: () => Promise<string>;
    temp?: { create: () => Promise<string>; remove: (path: string) => Promise<void> };
    loadWorkspaceSources?: WorkspaceSourceLoader;
  }
): Promise<AppOutcome> {
  try {
    const cli = parseCliArgs(argv);
    const context = await validateActionContext({
      runner: dependencies.runner,
      env: dependencies.env,
      readEvent: dependencies.readEvent,
    });
    const changes = await readMergeChanges(dependencies.runner);
    const paths = analysisPaths(changes.files);
    const executable = paths.filter(
      (path) => !isNonRuntimePath(path) && !globalCategories(path).length
    );
    const nx = await analyzeNxUpperBounds({
      executablePaths: executable,
      runner: dependencies.runner,
      temp: dependencies.temp,
    });
    const evidence: PathEvidence[] = [];
    const loadedSources = await (dependencies.loadWorkspaceSources ?? loadWorkspaceSources)({
      projectRoots: nx.projectRoots,
      projects: nx.prWideProjects,
    });
    const sourceResult: WorkspaceSourceResult = isSourceResult(loadedSources)
      ? loadedSources
      : { files: loadedSources, complete: true };
    const final = new Set<string>();
    const semantic = new Set<string>();
    const fallback = new Set<string>();
    for (const file of changes.files) {
      const categories = globalCategories(file.path);
      const sides = file.previousPath ? [file.path, file.previousPath] : [file.path];
      const executableSides = sides.filter(
        (path) => !isNonRuntimePath(path) && !globalCategories(path).length
      );
      if (!executableSides.length && isNonRuntimePath(file.path)) {
        evidence.push({
          path: file.path,
          decision: 'non-runtime',
          nxProjects: [],
          semanticProjects: [],
          finalProjects: [],
          reasonCodes: ['non-runtime'],
          declarations: [],
          references: [],
        });
        continue;
      }
      if (!executableSides.length && categories.length) {
        evidence.push({
          path: file.path,
          decision: 'repository-global',
          nxProjects: [],
          semanticProjects: [],
          finalProjects: [],
          reasonCodes: categories,
          declarations: [],
          references: [],
        });
        continue;
      }
      const nxProjects = [
        ...new Set(executableSides.flatMap((path) => nx.pathProjects.get(path) ?? [])),
      ].sort();
      if (!nxProjects?.length)
        throw new BlastRadiusError(
          ExitCode.UnrecognizedPath,
          `No Nx bound exists for ${JSON.stringify(file.path)}.`
        );
      const result = await narrowWithTypeScript({
        path: file.path,
        status: file.status,
        binary: file.binary,
        changedRanges:
          file.status === 'renamed' || file.status === 'deleted'
            ? []
            : await changedRanges(dependencies.runner, file.path),
        nxProjects,
        projectRoots: nx.projectRoots,
        reverseDependencies: nx.reverseDependencies,
        files: sourceResult.files,
        sourceComplete: sourceResult.complete,
      });
      result.finalProjects.forEach((project) => final.add(project));
      result.semanticProjects.forEach((project) => semantic.add(project));
      if (result.decision === 'nx-fallback') fallback.add(file.path);
      evidence.push({
        path: file.path,
        decision: result.decision,
        nxProjects,
        semanticProjects: result.semanticProjects,
        finalProjects: result.finalProjects,
        reasonCodes: [...(nx.pathReasonCodes.get(file.path) ?? []), ...result.reasonCodes],
        declarations: result.declarations,
        references: result.references,
      });
    }
    const globalMatches = paths.flatMap((path) =>
      globalCategories(path).map((category) => ({ category, path }))
    );
    const classification = classify({
      affectedProjects: [...final],
      totalProjects: nx.allProjects.length,
      globalMatches,
      allPathsRecognizedNonRuntime: paths.every(isNonRuntimePath),
    });
    const result = createResult({
      context,
      changes,
      totalProjects: nx.allProjects,
      prWideProjects: nx.prWideProjects,
      semanticProjects: [...semantic],
      fallbackPaths: [...fallback],
      affectedProjects: [...final],
      pathEvidence: evidence,
      radius: classification.radius,
      sensitivitySignals: sensitivitySignals(paths),
      reasons: classification.reasons,
      warnings: [
        'Advisory result from the PR merge checkout; TypeScript uncertainty retains the Nx bound.',
      ],
    });
    return { exitCode: 0, stdout: cli.json ? renderJson(result) : renderHuman(result), stderr: '' };
  } catch (error) {
    const known =
      error instanceof BlastRadiusError
        ? error
        : new BlastRadiusError(ExitCode.Internal, 'Unexpected blast-radius failure.');
    return { exitCode: known.exitCode, stdout: '', stderr: `${known.message}\n` };
  }
}
