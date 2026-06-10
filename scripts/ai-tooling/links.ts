import fs from 'node:fs';
import path from 'node:path';

export const SOURCE_PATH = '.ai/skills';
export const TARGET_PATHS = ['.agents/skills', '.claude/skills', '.cursor/skills'] as const;

// Every target dir is depth-2 from repo root (e.g. .cursor/skills), source is also depth-2 (.ai/skills),
// so the relative link body is identical for all targets:
//   <repo>/.cursor/skills/<name> -> ../../.ai/skills/<name>
export const linkBody = (name: string): string => path.join('..', '..', SOURCE_PATH, name);

// ── Logger ─────────────────────────────────────────────────────────────────────

export type LogAction = 'linked' | 'relinked' | 'pruned' | 'ok';
export type LogWarnKind = 'foreign-link' | 'real';

export type Logger = {
  add: (targetRel: string, name: string, action: LogAction) => void;
  warn: (targetRel: string, name: string, kind: LogWarnKind) => void;
  flush: () => void;
};

export const makeLogger = (): Logger => {
  const lines: string[] = [];
  return {
    add: (targetRel, name, action) => {
      lines.push(`  ${action.padEnd(8)} ${targetRel}/${name}`);
    },
    warn: (targetRel, name, kind) => {
      lines.push(`  SKIP     ${targetRel}/${name}  [collision: ${kind}]`);
    },
    flush: () => {
      for (const line of lines) {
        console.log(line);
      }
    },
  };
};

// ── Source skill discovery ─────────────────────────────────────────────────────

export const listSourceSkills = (repoRoot: string): string[] => {
  const sourceDir = path.join(repoRoot, SOURCE_PATH);
  if (fs.existsSync(sourceDir) === false) return [];
  return fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() === true)
    .filter((e) => fs.existsSync(path.join(sourceDir, e.name, 'SKILL.md')) === true)
    .map((e) => e.name);
};

// ── Ownership detection ────────────────────────────────────────────────────────

type EntryKind =
  | { kind: 'absent' }
  | { kind: 'ours'; correct: boolean } // our link; correct = points at the right skill
  | { kind: 'foreign-link' } // symlink elsewhere (e.g. .brain) — skip & warn
  | { kind: 'real' }; // real file/dir — skip & warn

const classify = (repoRoot: string, targetPath: string, name: string): EntryKind => {
  let lst: fs.Stats;
  try {
    lst = fs.lstatSync(targetPath);
  } catch {
    return { kind: 'absent' };
  }

  if (lst.isSymbolicLink() === false) return { kind: 'real' };

  const linkTargetRaw = fs.readlinkSync(targetPath);
  const resolved = path.resolve(path.dirname(targetPath), linkTargetRaw);

  // Trailing sep prevents sibling dirs like `.ai/skills-archive` from matching.
  const skillsRoot = path.join(repoRoot, SOURCE_PATH) + path.sep;
  if (resolved.startsWith(skillsRoot) === false) return { kind: 'foreign-link' };

  const expected = path.resolve(path.join(repoRoot, SOURCE_PATH, name));
  return { kind: 'ours', correct: resolved === expected };
};

// ── sync ──────────────────────────────────────────────────────────────────────

export const sync = (repoRoot: string, log: Logger): number => {
  const skills = listSourceSkills(repoRoot);
  let warnings = 0;

  for (const targetRel of TARGET_PATHS) {
    const targetDir = path.join(repoRoot, targetRel);
    fs.mkdirSync(targetDir, { recursive: true });

    // Link or re-point each source skill.
    for (const name of skills) {
      const p = path.join(targetDir, name);
      const k = classify(repoRoot, p, name);

      if (k.kind === 'absent') {
        fs.symlinkSync(linkBody(name), p);
        log.add(targetRel, name, 'linked');
      } else if (k.kind === 'ours' && k.correct === false) {
        fs.unlinkSync(p);
        fs.symlinkSync(linkBody(name), p);
        log.add(targetRel, name, 'relinked');
      } else if (k.kind === 'ours') {
        log.add(targetRel, name, 'ok');
      } else {
        // foreign-link | real — skip & warn; collision surfaces via non-zero exit.
        warnings += 1;
        log.warn(targetRel, name, k.kind as LogWarnKind);
      }
    }

    // Prune stale ours-links (source skill deleted or renamed).
    for (const entry of fs.readdirSync(targetDir)) {
      if (skills.includes(entry) === true) continue;
      const p = path.join(targetDir, entry);
      if (classify(repoRoot, p, entry).kind === 'ours') {
        fs.unlinkSync(p);
        log.add(targetRel, entry, 'pruned');
      }
    }
  }

  log.flush();
  // Non-zero exit signals collisions so they surface in CI / terminal.
  return warnings > 0 ? 1 : 0;
};

// ── unlink ────────────────────────────────────────────────────────────────────

export const unlink = (repoRoot: string, log: Logger): number => {
  for (const targetRel of TARGET_PATHS) {
    const targetDir = path.join(repoRoot, targetRel);
    if (fs.existsSync(targetDir) === false) continue;

    for (const entry of fs.readdirSync(targetDir)) {
      const p = path.join(targetDir, entry);
      const k = classify(repoRoot, p, entry);
      if (k.kind === 'ours') {
        fs.unlinkSync(p);
        log.add(targetRel, entry, 'pruned');
      }
      // All non-ours entries (foreign-link, real, absent) are silently skipped.
    }
  }

  log.flush();
  return 0;
};

// ── status ────────────────────────────────────────────────────────────────────

type StatusEntry = {
  name: string;
  status: 'linked' | 'missing' | 'conflict' | 'stale';
  detail?: string;
};

export const status = (repoRoot: string, _log: Logger): number => {
  const skills = listSourceSkills(repoRoot);

  for (const targetRel of TARGET_PATHS) {
    const targetDir = path.join(repoRoot, targetRel);
    console.log(`\n${targetRel}/`);

    const entries: StatusEntry[] = [];

    // Report on each source skill.
    for (const name of skills) {
      const p = path.join(targetDir, name);
      const k = classify(repoRoot, p, name);

      if (k.kind === 'absent') {
        entries.push({ name, status: 'missing' });
      } else if (k.kind === 'ours' && k.correct === true) {
        entries.push({ name, status: 'linked' });
      } else if (k.kind === 'ours' && k.correct === false) {
        entries.push({ name, status: 'conflict', detail: 'wrong target (ours but stale)' });
      } else {
        entries.push({ name, status: 'conflict', detail: k.kind });
      }
    }

    // Report stale ours-links not in source.
    if (fs.existsSync(targetDir) === true) {
      for (const entry of fs.readdirSync(targetDir)) {
        if (skills.includes(entry) === true) continue;
        const p = path.join(targetDir, entry);
        if (classify(repoRoot, p, entry).kind === 'ours') {
          entries.push({ name: entry, status: 'stale' });
        }
      }
    }

    if (entries.length === 0) {
      console.log('  (no source skills and no stale links)');
    }
    for (const e of entries) {
      const detail = e.detail !== undefined ? `  [${e.detail}]` : '';
      console.log(`  ${e.status.padEnd(8)} ${e.name}${detail}`);
    }
  }

  console.log('');
  return 0;
};
