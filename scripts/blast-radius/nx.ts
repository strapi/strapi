import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlastRadiusError, ExitCode } from './errors';
import type { CommandRunner } from './types';

type Temp = { create: () => Promise<string>; remove: (path: string) => Promise<void> };
const defaultTemp: Temp = {
  create: () => mkdtemp(join(tmpdir(), 'strapi-blast-radius-')),
  remove: (path) => rm(path, { recursive: true, force: true }),
};
const parseProjects = (value: string | Buffer) => {
  let data: unknown;
  try {
    data = JSON.parse(Buffer.from(value).toString('utf8'));
  } catch {
    throw new BlastRadiusError(ExitCode.Nx, 'Nx returned malformed project JSON.');
  }
  if (
    !Array.isArray(data) ||
    data.some((item) => typeof item !== 'string' || !item) ||
    new Set(data).size !== data.length
  )
    throw new BlastRadiusError(ExitCode.Nx, 'Nx returned invalid projects.');
  return [...data].sort();
};
const parseGraph = (value: string | Buffer, projects: readonly string[]) => {
  let data: unknown;
  try {
    data = JSON.parse(Buffer.from(value).toString('utf8'));
  } catch {
    throw new BlastRadiusError(ExitCode.Nx, 'Nx returned malformed graph JSON.');
  }
  if (!data || typeof data !== 'object')
    throw new BlastRadiusError(ExitCode.Nx, 'Nx returned an invalid project graph.');
  const graph = (data as { graph?: unknown }).graph;
  if (!graph || typeof graph !== 'object')
    throw new BlastRadiusError(ExitCode.Nx, 'Nx returned an invalid project graph.');
  const graphRecord = graph as { nodes?: unknown; dependencies?: unknown };
  if (
    !graphRecord.nodes ||
    typeof graphRecord.nodes !== 'object' ||
    !graphRecord.dependencies ||
    typeof graphRecord.dependencies !== 'object'
  )
    throw new BlastRadiusError(ExitCode.Nx, 'Nx returned an invalid project graph.');
  const nodes = graphRecord.nodes as Record<string, unknown>;
  const dependenciesBySource = graphRecord.dependencies as Record<string, unknown>;
  const nodeNames = Object.keys(nodes).sort();
  const dependencyNames = Object.keys(dependenciesBySource).sort();
  const expectedNames = [...projects].sort();
  if (
    nodeNames.length !== expectedNames.length ||
    dependencyNames.length !== expectedNames.length ||
    nodeNames.some((name, index) => name !== expectedNames[index]) ||
    dependencyNames.some((name, index) => name !== expectedNames[index])
  )
    throw new BlastRadiusError(ExitCode.Nx, 'Nx graph does not cover the complete project set.');
  const roots: Record<string, string> = {};
  const reverse: Record<string, string[]> = Object.fromEntries(
    projects.map((project) => [project, []])
  );
  for (const project of projects) {
    const node = nodes[project];
    const root =
      node && typeof node === 'object'
        ? (node as { data?: { root?: unknown } }).data?.root
        : undefined;
    if (typeof root !== 'string' || !root || Object.values(roots).includes(root))
      throw new BlastRadiusError(ExitCode.Nx, 'Nx returned ambiguous project roots.');
    roots[project] = root;
  }
  for (const [source, dependencies] of Object.entries(dependenciesBySource)) {
    if (!projects.includes(source) || !Array.isArray(dependencies))
      throw new BlastRadiusError(ExitCode.Nx, 'Nx returned invalid project graph edges.');
    for (const edge of dependencies as Array<{ target?: unknown }>) {
      if (typeof edge.target !== 'string' || !projects.includes(edge.target))
        throw new BlastRadiusError(ExitCode.Nx, 'Nx returned an unknown graph edge.');
      reverse[edge.target].push(source);
    }
  }
  for (const values of Object.values(reverse)) values.sort();
  return { projectRoots: roots, reverseDependencies: reverse };
};
export async function analyzeNxUpperBounds(input: {
  executablePaths: readonly string[];
  runner: CommandRunner;
  cwd?: string;
  temp?: Temp;
}) {
  const temp = input.temp ?? defaultTemp;
  let directory: string;
  try {
    directory = await temp.create();
  } catch {
    throw new BlastRadiusError(ExitCode.Nx, 'Could not create isolated Nx workspace data.');
  }
  const env = {
    NX_DAEMON: 'false',
    NX_CACHE_PROJECT_GRAPH: 'false',
    NX_WORKSPACE_DATA_DIRECTORY: directory,
  };
  const call = async (args: string[]) => {
    try {
      return await input.runner({ executable: 'yarn', args, cwd: input.cwd, env });
    } catch {
      throw new BlastRadiusError(ExitCode.Nx, 'Workspace graph command failed.');
    }
  };
  let result:
    | {
        allProjects: string[];
        prWideProjects: string[];
        pathProjects: Map<string, string[]>;
        pathReasonCodes: Map<string, string[]>;
        projectRoots: Record<string, string>;
        reverseDependencies: Record<string, string[]>;
      }
    | undefined;
  let primaryError: unknown;
  try {
    const allProjects = parseProjects((await call(['nx', 'show', 'projects', '--json'])).stdout);
    if (!allProjects.length)
      throw new BlastRadiusError(ExitCode.Nx, 'Nx returned no workspace projects.');
    const prWideProjects = parseProjects(
      (
        await call([
          'nx',
          'show',
          'projects',
          '--affected',
          '--base=HEAD^1',
          '--head=HEAD',
          '--json',
        ])
      ).stdout
    );
    if (prWideProjects.some((project) => !allProjects.includes(project)))
      throw new BlastRadiusError(ExitCode.Nx, 'Nx affected projects are outside the workspace.');
    const graph = parseGraph(
      (await call(['nx', 'graph', '--file=stdout', '--watch=false', '--open=false'])).stdout,
      allProjects
    );
    const pathProjects = new Map<string, string[]>();
    const pathReasonCodes = new Map<string, string[]>();
    for (const path of [...new Set(input.executablePaths)].sort()) {
      let projects: string[];
      if (path.includes(',')) {
        projects = prWideProjects;
        pathReasonCodes.set(path, ['nx-path-unrepresentable']);
      } else
        projects = parseProjects(
          (await call(['nx', 'show', 'projects', '--affected', `--files=${path}`, '--json'])).stdout
        );
      if (!projects.length)
        throw new BlastRadiusError(
          ExitCode.UnrecognizedPath,
          `Nx could not safely map executable path ${JSON.stringify(path)}.`
        );
      if (
        projects.some(
          (project) => !allProjects.includes(project) || !prWideProjects.includes(project)
        )
      )
        throw new BlastRadiusError(
          ExitCode.Nx,
          'Nx path projects are outside the PR-wide upper bound.'
        );
      pathProjects.set(path, projects);
    }
    result = { allProjects, prWideProjects, pathProjects, pathReasonCodes, ...graph };
  } catch (error) {
    primaryError = error;
  }
  let cleanupError: unknown;
  try {
    await temp.remove(directory);
  } catch (error) {
    cleanupError = error;
  }
  if (primaryError) throw primaryError;
  if (cleanupError)
    throw new BlastRadiusError(ExitCode.Nx, 'Could not clean isolated Nx workspace data.');
  return result!;
}
