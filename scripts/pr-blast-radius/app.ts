import { parseCliArgs } from './cli';
import { classify } from './classifier';
import { BlastRadiusError, ExitCode } from './errors';
import { createResult, renderHuman, renderJson } from './format';
import { retrievePullRequest } from './github';
import { analyzeWorkspace } from './nx';
import { analysisPaths, globalCategories, isNonRuntimePath, sensitivitySignals } from './paths';
import type { CommandRunner } from './types';

export type AppOutcome = { exitCode: number; stdout: string; stderr: string };
export async function run(
  argv: readonly string[],
  dependencies: { runner: CommandRunner }
): Promise<AppOutcome> {
  try {
    const args = parseCliArgs(argv);
    const snapshot = await retrievePullRequest(dependencies.runner, args.pullRequest);
    const paths = analysisPaths(snapshot.files);
    const workspace = await analyzeWorkspace(dependencies.runner, paths);
    const globalMatches = paths.flatMap((path) =>
      globalCategories(path).map((category) => ({ category, path }))
    );
    const classification = classify({
      affectedProjects: workspace.affectedProjects,
      totalProjects: workspace.allProjects.length,
      globalMatches,
      allPathsRecognizedNonRuntime: paths.every(isNonRuntimePath),
    });
    const result = createResult({
      snapshot,
      workspaceRevision: workspace.workspaceRevision,
      radius: classification.radius,
      reasons: classification.reasons,
      affectedProjects: workspace.affectedProjects,
      totalProjects: workspace.allProjects.length,
      sensitivitySignals: sensitivitySignals(paths),
    });
    return {
      exitCode: 0,
      stdout: args.json ? renderJson(result) : renderHuman(result),
      stderr: '',
    };
  } catch (error) {
    const known =
      error instanceof BlastRadiusError
        ? error
        : new BlastRadiusError(ExitCode.Internal, 'Unexpected blast-radius failure.');
    return { exitCode: known.exitCode, stdout: '', stderr: `${known.message}\n` };
  }
}
