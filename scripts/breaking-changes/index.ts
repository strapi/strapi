#!/usr/bin/env tsx
/**
 * Breaking-change triage for the Strapi monorepo.
 *
 * Compares the working tree against the merge-base with `develop` and reports every
 * change that lands on a public surface, with a candidate tier. It is a triage tool,
 * not a proof of non-breakage: it cannot see a behaviour change inside a function body.
 *
 * The policy, the tier definitions and the escalation procedure live in
 * `.ai/skills/breaking-changes/SKILL.md`. Read that before acting on this output.
 *
 * Usage:
 *   yarn check:breaking
 *   yarn check:breaking --base=origin/develop
 *   yarn check:breaking --json
 *
 * Exit codes: 0 = nothing on a public surface, 1 = findings to classify, 2 = bad usage.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyPath,
  diffManifest,
  diffNamedExports,
  diffRoutes,
  diffSchema,
  type ChangedFile,
  type ChangeKind,
  type Finding,
  type Tier,
} from './surfaces';

// @ts-expect-error - import.meta.url is not supported in a commonjs context
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');

const git = (args: string[]): string =>
  execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    // Capture stderr rather than inheriting it: `git show` on a path that does not exist
    // in the base is an expected miss, not something to print.
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const gitOrNull = (args: string[]): string | null => {
  try {
    return git(args);
  } catch {
    return null;
  }
};

interface Options {
  base: string | undefined;
  json: boolean;
  quiet: boolean;
}

const parseArgs = (): Options => {
  const args = process.argv.slice(2);
  const unknown = args.filter(
    (arg) => arg.startsWith('--base=') === false && ['--json', '--quiet'].includes(arg) === false
  );

  if (unknown.length > 0) {
    console.error(`Unknown argument(s): ${unknown.join(', ')}`);
    console.error('Usage: yarn check:breaking [--base=<ref>] [--json] [--quiet]');
    process.exit(2);
  }

  return {
    base: args.find((arg) => arg.startsWith('--base='))?.slice('--base='.length),
    json: args.includes('--json'),
    quiet: args.includes('--quiet'),
  };
};

const resolveBase = (explicit: string | undefined): string => {
  if (explicit !== undefined) {
    const resolved = gitOrNull(['rev-parse', '--verify', explicit]);

    if (resolved === null) {
      console.error(`Cannot resolve --base=${explicit}`);
      process.exit(2);
    }

    return resolved.trim();
  }

  for (const ref of ['origin/develop', 'develop']) {
    const mergeBase = gitOrNull(['merge-base', 'HEAD', ref]);

    if (mergeBase !== null) {
      return mergeBase.trim();
    }
  }

  console.error('Could not find a merge-base with origin/develop or develop.');
  console.error('Pass one explicitly: yarn check:breaking --base=<ref>');
  process.exit(2);
};

const KINDS: Record<string, ChangeKind> = { A: 'added', M: 'modified', D: 'deleted', R: 'renamed' };

const changedFiles = (base: string): ChangedFile[] => {
  const raw = git(['diff', '--name-status', '--find-renames', base]);
  const files: ChangedFile[] = [];

  for (const line of raw.split('\n')) {
    if (line.trim() === '') {
      continue;
    }

    const [status, ...paths] = line.split('\t');
    const kind = KINDS[status[0]] ?? 'modified';

    files.push(
      kind === 'renamed' ? { path: paths[1], oldPath: paths[0], kind } : { path: paths[0], kind }
    );
  }

  const untracked = git(['ls-files', '--others', '--exclude-standard']);

  for (const line of untracked.split('\n')) {
    if (line.trim() !== '') {
      files.push({ path: line, kind: 'added' });
    }
  }

  return files;
};

const readAt = (ref: string, filePath: string): string | null =>
  gitOrNull(['show', `${ref}:${filePath}`]);

const readWorkingTree = (filePath: string): string | null => {
  try {
    return readFileSync(path.join(repoRoot, filePath), 'utf8');
  } catch {
    return null;
  }
};

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

const deepFindings = (
  file: ChangedFile,
  surfaceName: string,
  base: string
): Omit<Finding, 'path' | 'surface'>[] => {
  const previousPath = file.oldPath ?? file.path;
  const before = readAt(base, previousPath);
  const after = readWorkingTree(file.path);

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

  if (/(^|\/)routes(\/|\.)/.test(file.path) === true) {
    return diffRoutes(before, after);
  }

  if (surfaceName === 'package public exports' || surfaceName.includes('types') === true) {
    return diffNamedExports(before, after);
  }

  return [];
};

const collect = (base: string): Finding[] => {
  const findings: Finding[] = [];

  for (const file of changedFiles(base)) {
    const surface = classifyPath(file.path);

    if (surface === null || surface.tier === 3) {
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

    if (file.kind === 'renamed') {
      findings.push({
        path: file.path,
        tier: surface.tier,
        surface: surface.name,
        rule: 'file:renamed',
        detail: `renamed from "${String(file.oldPath)}" — deep imports of the old path break`,
      });
    }

    const deep = deepFindings(file, surface.name, base);

    if (deep.length > 0) {
      findings.push(...deep.map((entry) => ({ ...entry, path: file.path, surface: surface.name })));
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

const TIER_LABEL: Record<Tier, string> = {
  1: 'TIER 1 — supported (majors only)',
  2: 'TIER 2 — reachable internals (release-note callout)',
  3: 'TIER 3 — internal',
};

const report = (findings: Finding[], base: string, options: Options): void => {
  if (options.json === true) {
    console.log(JSON.stringify({ base, findings }, null, 2));
    return;
  }

  const shortBase = base.slice(0, 9);

  if (findings.length === 0) {
    console.log(`No public-surface changes detected against ${shortBase}.`);

    if (options.quiet === false) {
      console.log(
        'This is triage only: it cannot see behaviour changes inside a function body.\n' +
          'Still read .ai/skills/breaking-changes/SKILL.md before reporting the change as done.'
      );
    }

    return;
  }

  console.log(`Public-surface changes against ${shortBase}: ${findings.length} finding(s)\n`);

  for (const tier of [1, 2] as Tier[]) {
    const group = findings.filter((finding) => finding.tier === tier);

    if (group.length === 0) {
      continue;
    }

    console.log(TIER_LABEL[tier]);

    for (const finding of group) {
      console.log(`  ${finding.path}`);
      console.log(`    [${finding.surface}] ${finding.rule}`);
      console.log(`    ${finding.detail}`);
    }

    console.log('');
  }

  if (options.quiet === false) {
    console.log(
      'Each finding is a CANDIDATE, not a verdict. For every one:\n' +
        '  1. Confirm documentation status on https://docs.strapi.io (Tier 1 only if documented).\n' +
        '  2. Check it against the "not a breaking change" list in the skill.\n' +
        '  3. Ask whether upgrading requires user action.\n' +
        '  4. If it is a Tier 1 break, try a non-breaking shape — then STOP and ask a human.\n' +
        'Full procedure: .ai/skills/breaking-changes/SKILL.md'
    );
  }
};

const options = parseArgs();
const base = resolveBase(options.base);
const findings = collect(base);

report(findings, base, options);
process.exit(findings.length === 0 ? 0 : 1);
