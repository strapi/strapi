import path from 'node:path';
import fs from 'node:fs/promises';
import chalk from 'chalk';

/**
 * `strapi user-stories:sync-e2e`
 *
 * Deterministic scaffolder that keeps the Vitest e2e specs in sync with the Gherkin acceptance
 * criteria authored under `docs/user-stories/`. It parses each story file, maps it to the matching
 * `*.vitest.spec.ts`, and emits one `test()` per acceptance criterion. It NEVER overwrites a spec
 * that already exists (so hand-written test bodies are safe) unless `--force` is passed — instead it
 * reports the drift. Selector-accurate bodies are filled in afterwards by hand or via the
 * Playwright MCP workflow.
 */

export interface AcceptanceCriterion {
  id: string; // e.g. "AC1.2"
  short: string; // human label derived from the When/Then clause
  given?: string;
  when?: string;
  then?: string;
  raw: string;
}

export interface UserStory {
  name: string;
  criteria: AcceptanceCriterion[];
}

export interface ParsedUserStoryDoc {
  title: string;
  /** The `> Source:` spec path, e.g. `tests/e2e/tests/admin/login.spec.ts`. */
  source?: string;
  stories: UserStory[];
}

const clausesOf = (bullet: string) => {
  const grab = (label: string, next: string[]) => {
    const re = new RegExp(
      `\\*\\*${label}\\*\\*\\s*(.*?)(?=${next.map((n) => `\\*\\*${n}\\*\\*`).join('|')}|$)`,
      's'
    );
    const m = bullet.match(re);
    return m
      ? m[1]
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/[.\s]+$/, '')
      : undefined;
  };
  return {
    given: grab('Given', ['When', 'Then', 'And']),
    when: grab('When', ['Then', 'And']),
    then: grab('Then', ['And']),
  };
};

const truncate = (text: string, max = 70) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

/**
 * Parse a single user-story markdown file. Recognises the format documented in
 * `docs/user-stories/README.md`: an H1 title, a `> Source:` line, `## User Story:` blocks, and
 * Given/When/Then bullets under each `### Acceptance Criteria`.
 */
export const parseUserStory = (markdown: string): ParsedUserStoryDoc => {
  const lines = markdown.split(/\r?\n/);

  const title =
    lines
      .find((l) => /^#\s+/.test(l))
      ?.replace(/^#\s+/, '')
      .trim() ?? 'User stories';
  const source = markdown.match(/^>\s*Source:\s*`([^`]+)`/m)?.[1]?.trim();

  const stories: UserStory[] = [];
  let current: UserStory | undefined;

  for (const line of lines) {
    const storyMatch = line.match(/^##\s+User Story:\s*(.+)$/);
    if (storyMatch) {
      current = { name: storyMatch[1].trim(), criteria: [] };
      stories.push(current);
      continue;
    }

    // An acceptance criterion is a bullet that asserts an outcome (contains a **Then** clause).
    // Parenthetical notes like "- (Rate limiting is toggled off again.)" are intentionally skipped.
    const bulletMatch = line.match(/^\s*[-*]\s+(.*\*\*Then\*\*.*)$/);
    if (bulletMatch && current) {
      const raw = bulletMatch[1].trim();
      const { given, when, then } = clausesOf(raw);
      const idx = current.criteria.length + 1;
      const short = truncate(when || then || current.name);
      current.criteria.push({
        id: `AC${stories.length}.${idx}`,
        short,
        given,
        when,
        then,
        raw,
      });
    }
  }

  return { title, source, stories };
};

const escapeSingleQuotes = (text: string) => text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/** Convert a `> Source:` path (`…/login.spec.ts`) to its Vitest sibling (`…/login.vitest.spec.ts`). */
export const toVitestSpecPath = (source: string) =>
  source.replace(/\.spec\.ts$/, '.vitest.spec.ts');

/** POSIX relative path from a spec file to `tests/e2e/vitest`, for the fixture imports. */
const fixtureImportPrefix = (specPathFromRoot: string) => {
  const rel = path.relative(path.dirname(specPathFromRoot), path.join('tests', 'e2e', 'vitest'));
  const posix = rel.split(path.sep).join('/');
  return posix.startsWith('.') ? posix : `./${posix}`;
};

/** Render a full skeleton spec (every criterion as `test.todo`). */
export const renderSkeleton = (
  doc: ParsedUserStoryDoc,
  { sourceDocRelPath, specPathFromRoot }: { sourceDocRelPath: string; specPathFromRoot: string }
): string => {
  const prefix = fixtureImportPrefix(specPathFromRoot);

  const body = doc.stories
    .map((story) => {
      const tests = story.criteria
        .map((ac) => {
          const gwt = [
            ac.given && `    // Given ${ac.given}`,
            ac.when && `    // When ${ac.when}`,
            ac.then && `    // Then ${ac.then}`,
          ]
            .filter(Boolean)
            .join('\n');
          const comment = gwt ? `${gwt}\n` : '';
          return `${comment}    test.todo('${escapeSingleQuotes(`${ac.id} — ${ac.short}`)}');`;
        })
        .join('\n\n');
      return `  describe('${escapeSingleQuotes(story.name)}', () => {\n${tests}\n  });`;
    })
    .join('\n\n');

  return `import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/${sourceDocRelPath} by \`strapi user-stories:sync-e2e\`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '${prefix}/browser-fixture';
// import { expect } from '${prefix}/expect';

describe('${escapeSingleQuotes(doc.title)}', () => {
${body}
});
`;
};

const AC_ID_RE = /test(?:\.todo|\.skip|\.only)?\s*\(\s*['"`](AC\d+\.\d+)/g;

/** Extract the AC ids already referenced by an existing spec file. */
export const extractExistingIds = (specSource: string): Set<string> => {
  const ids = new Set<string>();
  for (const m of specSource.matchAll(AC_ID_RE)) ids.add(m[1]);
  return ids;
};

export type SyncStatus = 'create' | 'ok' | 'drift' | 'skip';

export interface SyncResult {
  doc: string; // user-story doc path (relative to input)
  specPath?: string; // target spec path (relative to cwd)
  status: SyncStatus;
  missing: string[]; // AC ids in the doc but not in the spec
  orphaned: string[]; // AC ids in the spec but not in the doc
  reason?: string; // for 'skip'
  wrote?: boolean;
}

const listMarkdownFiles = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.md') && e.name.toLowerCase() !== 'readme.md')
    .map((e) => path.join((e as any).parentPath ?? (e as any).path ?? dir, e.name));
};

const fileExists = async (p: string) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

export interface SyncOptions {
  /** Directory of user-story markdown files (default: docs/user-stories). */
  input: string;
  /** Write changes to disk. Without it the command is read-only (check mode). */
  write?: boolean;
  /** Overwrite existing specs that have drifted (regenerates the skeleton, dropping bodies). */
  force?: boolean;
  /** Base directory the spec paths are resolved against (default: process.cwd()). */
  cwd?: string;
}

/**
 * Core sync routine — pure enough to unit test: give it a `cwd` pointing at a fixture tree and it
 * reports/writes deterministically.
 */
export const syncUserStories = async (options: SyncOptions): Promise<SyncResult[]> => {
  const cwd = options.cwd ?? process.cwd();
  const inputDir = path.resolve(cwd, options.input);

  if (!(await fileExists(inputDir))) {
    throw new Error(`Input directory not found: ${inputDir}`);
  }

  const docs = (await listMarkdownFiles(inputDir)).sort();
  const results: SyncResult[] = [];

  for (const docPath of docs) {
    const docRel = path.relative(inputDir, docPath);
    const markdown = await fs.readFile(docPath, 'utf8');
    const parsed = parseUserStory(markdown);

    if (!parsed.source) {
      results.push({
        doc: docRel,
        status: 'skip',
        missing: [],
        orphaned: [],
        reason: 'no `> Source:` line — cannot map to a spec',
      });
      continue;
    }

    const desiredIds = parsed.stories.flatMap((s) => s.criteria.map((c) => c.id));
    const specRel = toVitestSpecPath(parsed.source);
    const specAbs = path.resolve(cwd, specRel);
    const exists = await fileExists(specAbs);

    // Doc path relative to the repo `docs/` dir for the generated header comment.
    const sourceDocRelPath = path
      .relative(path.resolve(cwd, 'docs'), docPath)
      .split(path.sep)
      .join('/');

    if (!exists) {
      let wrote = false;
      if (options.write) {
        await fs.mkdir(path.dirname(specAbs), { recursive: true });
        await fs.writeFile(
          specAbs,
          renderSkeleton(parsed, { sourceDocRelPath, specPathFromRoot: specRel })
        );
        wrote = true;
      }
      results.push({
        doc: docRel,
        specPath: specRel,
        status: 'create',
        missing: desiredIds,
        orphaned: [],
        wrote,
      });
      continue;
    }

    const existingIds = extractExistingIds(await fs.readFile(specAbs, 'utf8'));
    const missing = desiredIds.filter((id) => !existingIds.has(id));
    const orphaned = [...existingIds].filter((id) => !desiredIds.includes(id));
    const status: SyncStatus = missing.length || orphaned.length ? 'drift' : 'ok';

    let wrote = false;
    if (options.write && status === 'drift' && options.force) {
      await fs.writeFile(
        specAbs,
        renderSkeleton(parsed, { sourceDocRelPath, specPathFromRoot: specRel })
      );
      wrote = true;
    }

    results.push({ doc: docRel, specPath: specRel, status, missing, orphaned, wrote });
  }

  return results;
};

interface CmdOptions {
  input: string;
  write?: boolean;
  force?: boolean;
}

const printReport = (results: SyncResult[], { write, force }: CmdOptions) => {
  for (const r of results) {
    if (r.status === 'skip') {
      console.log(`${chalk.gray('skip ')} ${r.doc} — ${r.reason}`);
    } else if (r.status === 'create') {
      const tag = r.wrote ? chalk.green('created') : chalk.yellow('missing');
      console.log(`${tag} ${r.specPath} (${r.missing.length} criteria)`);
    } else if (r.status === 'ok') {
      console.log(`${chalk.green('ok   ')} ${r.specPath}`);
    } else {
      const tag = r.wrote ? chalk.green('rewrote') : chalk.yellow('drift  ');
      const details = [
        r.missing.length ? `+${r.missing.length} missing (${r.missing.join(', ')})` : '',
        r.orphaned.length ? `-${r.orphaned.length} orphaned (${r.orphaned.join(', ')})` : '',
      ]
        .filter(Boolean)
        .join('  ');
      console.log(`${tag} ${r.specPath}  ${details}`);
    }
  }

  const drifted = results.filter((r) => r.status === 'drift' && !r.wrote);
  const created = results.filter((r) => r.status === 'create' && !r.wrote);

  if (!write) {
    console.log('');
    console.log(
      chalk.bold(
        `${results.length} doc(s) checked · ${created.length} spec(s) to create · ${drifted.length} drifted`
      )
    );
    if (created.length || drifted.length) {
      console.log(
        chalk.gray(
          'Run with --write to create missing specs, --write --force to regenerate drifted ones.'
        )
      );
    }
  } else if (drifted.length && !force) {
    console.log('');
    console.log(
      chalk.yellow(
        `${drifted.length} existing spec(s) drifted and were left untouched (re-run with --force to regenerate).`
      )
    );
  }

  return created.length + drifted.length;
};

export const action = async (options: CmdOptions) => {
  const results = await syncUserStories(options);
  const outstanding = printReport(results, options);

  // In check mode (no --write), exit non-zero when specs are missing or drifted so CI can gate on it.
  if (!options.write && outstanding > 0) {
    process.exit(1);
  }
};

export default action;
