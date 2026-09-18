import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { compareCodePoints } from './ordering';

const sourceExtension = /\.(?:[cm]?[jt]sx?)$/;
const ignoredDirectories = new Set(['node_modules', 'dist', 'build', 'coverage', '.git']);
export type WorkspaceSourceRequest = {
  cwd?: string;
  projectRoots: Record<string, string>;
  projects: readonly string[];
};
export type WorkspaceSourceResult = {
  files: Record<string, string>;
  complete: boolean;
  unreadable?: string;
};
export type WorkspaceSourceLoader = (
  request: WorkspaceSourceRequest
) => Promise<WorkspaceSourceResult | Record<string, string>>;

async function walk(
  root: string,
  cwd: string,
  files: Record<string, string>
): Promise<string | undefined> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return root;
  }
  for (const entry of entries) {
    const absolute = join(root, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        const unreadable = await walk(absolute, cwd, files);
        if (unreadable) return unreadable;
      }
    } else if (
      entry.isFile() &&
      sourceExtension.test(entry.name) &&
      !entry.name.endsWith('.d.ts')
    ) {
      const path = relative(cwd, absolute).split(sep).join('/');
      try {
        files[path] = await readFile(absolute, 'utf8');
      } catch {
        return absolute;
      }
    }
  }
  return undefined;
}

export const loadWorkspaceSources: (
  request: WorkspaceSourceRequest
) => Promise<WorkspaceSourceResult> = async ({ cwd = process.cwd(), projectRoots, projects }) => {
  const files: Record<string, string> = {};
  const roots = [
    ...new Set(
      projects
        .map((project) => projectRoots[project])
        .filter((root): root is string => Boolean(root))
    ),
  ].sort(compareCodePoints);
  for (const root of roots) {
    const unreadable = await walk(join(cwd, root), cwd, files);
    if (unreadable) return { files, complete: false, unreadable };
  }
  return { files, complete: true };
};
