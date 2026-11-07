/**
 * Turns a list of changed files into findings. Git and the filesystem are injected through
 * `Sources`, so this runs in unit tests exactly as it runs in `index.ts`.
 */
import {
  classifyPath,
  diffManifest,
  diffNamedExports,
  diffRoutes,
  diffSchema,
  mergeTier,
  type ChangedFile,
  type Finding,
  type PublishedFiles,
  type Surface,
} from './surfaces';

export interface Sources {
  /** File contents at the base ref, or null when it does not exist there. */
  readBefore: (filePath: string) => string | null;
  /** File contents in the working tree, or null when it does not exist. */
  readAfter: (filePath: string) => string | null;
  published: PublishedFiles;
}

type RuleFinding = Omit<Finding, 'path' | 'surface'>;

const parseJson = (source: string | null): Record<string, unknown> | null => {
  if (source === null) {
    return null;
  }

  try {
    return JSON.parse(source) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const deepFindings = (file: ChangedFile, surface: Surface, sources: Sources): RuleFinding[] => {
  const before = sources.readBefore(file.oldPath ?? file.path);
  const after = sources.readAfter(file.path);

  if (before === null || after === null) {
    return [];
  }

  if (file.path.endsWith('package.json') === true) {
    const beforeJson = parseJson(before);
    const afterJson = parseJson(after);

    return beforeJson === null || afterJson === null ? [] : diffManifest(beforeJson, afterJson);
  }

  if (file.path.endsWith('schema.json') === true) {
    const beforeJson = parseJson(before);
    const afterJson = parseJson(after);

    return beforeJson === null || afterJson === null ? [] : diffSchema(beforeJson, afterJson);
  }

  if (/(^|\/)routes(\/|[.])/.test(file.path) === true) {
    return diffRoutes(before, after);
  }

  if (
    sources.published.entries.has(file.path) === true ||
    surface.name === 'package public exports' ||
    surface.name.includes('types') === true
  ) {
    return diffNamedExports(before, after);
  }

  return [];
};

const isPublic = (surface: Surface | null): surface is Surface =>
  surface !== null && surface.tier !== 3;

export const collectFindings = (files: ChangedFile[], sources: Sources): Finding[] => {
  const findings: Finding[] = [];

  for (const file of files) {
    const surface = classifyPath(file.path, sources.published);

    if (file.kind === 'renamed' && file.oldPath !== undefined) {
      // Classify the old path too: moving a public file into an internal path still
      // breaks every import of the old one.
      const oldSurface = classifyPath(file.oldPath, sources.published);

      if (isPublic(oldSurface) === true) {
        findings.push({
          path: file.oldPath,
          tier: oldSurface.tier,
          surface: oldSurface.name,
          rule: 'file:renamed',
          detail: `renamed to "${file.path}" — imports of the old path break`,
        });
      }
    }

    if (isPublic(surface) === false) {
      continue;
    }

    if (file.kind === 'deleted') {
      findings.push({
        path: file.path,
        tier: surface.tier,
        surface: surface.name,
        rule: 'file:deleted',
        detail: 'file removed from a public surface — anything it exported is gone',
      });
      continue;
    }

    const deep = deepFindings(file, surface, sources);

    if (deep.length > 0) {
      findings.push(
        ...deep.map((entry) => ({
          ...entry,
          tier: mergeTier(surface.tier, entry.tier),
          path: file.path,
          surface: surface.name,
        }))
      );
      continue;
    }

    if (file.kind === 'modified') {
      findings.push({
        path: file.path,
        tier: surface.tier,
        surface: surface.name,
        rule: 'surface:touched',
        detail: 'a public surface was modified — classify the behaviour change by hand',
      });
    }
  }

  return findings;
};
