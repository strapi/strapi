import { BlastRadiusError, ExitCode } from './errors';
import { globalCategories, isNonRuntimePath } from './paths';
import type { CommandRunner } from './types';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const parse = (value: string) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new BlastRadiusError(ExitCode.Nx, 'Nx returned malformed project JSON.');
  }
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string' || !item))
    throw new BlastRadiusError(ExitCode.Nx, 'Nx returned invalid projects.');
  return [...new Set(parsed)].sort();
};
export type WorkspaceTempLifecycle = {
  createTemp: () => Promise<string>;
  removeTemp: (path: string) => Promise<void>;
};
const defaultTempLifecycle: WorkspaceTempLifecycle = {
  createTemp: () => mkdtemp(join(tmpdir(), 'strapi-pr-blast-radius-')),
  removeTemp: (path) => rm(path, { recursive: true, force: true }),
};
export async function analyzeWorkspace(
  runner: CommandRunner,
  paths: readonly string[],
  cwd = process.cwd(),
  lifecycle: WorkspaceTempLifecycle = defaultTempLifecycle
) {
  let workspaceData: string;
  try {
    workspaceData = await lifecycle.createTemp();
  } catch {
    throw new BlastRadiusError(ExitCode.Nx, 'Could not create isolated Nx workspace data.');
  }
  const call = async (executable: string, args: string[]) => {
    try {
      return await runner({
        executable,
        args,
        cwd,
        env:
          executable === 'yarn'
            ? {
                NX_DAEMON: 'false',
                NX_CACHE_PROJECT_GRAPH: 'false',
                NX_WORKSPACE_DATA_DIRECTORY: workspaceData,
              }
            : undefined,
      });
    } catch {
      throw new BlastRadiusError(ExitCode.Nx, 'Workspace graph command failed.');
    }
  };
  let primaryError: unknown;
  let result:
    | { workspaceRevision: string; allProjects: string[]; affectedProjects: string[] }
    | undefined;
  try {
    const before = (await call('git', ['rev-parse', '--verify', 'HEAD^{commit}'])).stdout
      .trim()
      .toLowerCase();
    if (!/^[a-f\d]{40}(?:[a-f\d]{24})?$/.test(before))
      throw new BlastRadiusError(ExitCode.Nx, 'Workspace revision is invalid.');
    const allProjects = parse((await call('yarn', ['nx', 'show', 'projects', '--json'])).stdout);
    if (!allProjects.length)
      throw new BlastRadiusError(ExitCode.Nx, 'Nx returned no workspace projects.');
    const affected = new Set<string>();
    const unmapped: string[] = [];
    const commaPaths: string[] = [];
    for (const path of [...new Set(paths)].sort()) {
      if (path.includes(',')) {
        commaPaths.push(path);
        continue;
      }
      const values = parse(
        (await call('yarn', ['nx', 'show', 'projects', '--affected', `--files=${path}`, '--json']))
          .stdout
      );
      if (!values.length && !isNonRuntimePath(path) && !globalCategories(path).length)
        unmapped.push(path);
      values.forEach((value) => affected.add(value));
    }
    const after = (await call('git', ['rev-parse', '--verify', 'HEAD^{commit}'])).stdout
      .trim()
      .toLowerCase();
    if (after !== before)
      throw new BlastRadiusError(ExitCode.Nx, 'Workspace revision changed during analysis.');
    const affectedProjects = [...affected].sort();
    if (affectedProjects.some((value) => !allProjects.includes(value)))
      throw new BlastRadiusError(ExitCode.Nx, 'Affected project is not in workspace graph.');
    if (unmapped.length || commaPaths.length)
      throw new BlastRadiusError(
        ExitCode.UnrecognizedPath,
        `Nx could not safely map executable paths: ${[...unmapped, ...commaPaths]
          .map((path) => JSON.stringify(path))
          .join(', ')}`
      );
    result = { workspaceRevision: before, allProjects, affectedProjects };
  } catch (error) {
    primaryError = error;
  }
  let cleanupError: unknown;
  try {
    await lifecycle.removeTemp(workspaceData);
  } catch (error) {
    cleanupError = error;
  }
  if (primaryError) throw primaryError;
  if (cleanupError)
    throw new BlastRadiusError(ExitCode.Nx, 'Could not clean isolated Nx workspace data.');
  return result!;
}
