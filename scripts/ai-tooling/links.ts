import fs from 'node:fs';
import path from 'node:path';

export const SOURCE_PATH = '.ai/skills';
export const TARGET_PATHS = ['.agents/skills', '.claude/skills', '.cursor/skills'] as const;

const isWin = process.platform === 'win32';
const LINK_TYPE = isWin ? 'junction' : 'dir';

const assertDepth2 = (rel: string): void => {
  const segments = rel.split(/[/\\]/).filter((s) => s.length > 0);
  if (segments.length !== 2) {
    throw new Error(`TARGET_PATHS entry must be depth-2 from repo root, got: ${rel}`);
  }
};

for (const targetRel of TARGET_PATHS) {
  assertDepth2(targetRel);
}

/** Case-insensitive on Windows; exact on POSIX. */
export const pathsEqual = (
  a: string,
  b: string,
  platform: NodeJS.Platform = process.platform
): boolean => (platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b);

/** True when `resolved` is under `skillsRoot` (handles trailing sep + casing). */
export const isUnderSkillsRoot = (
  resolved: string,
  skillsRoot: string,
  platform: NodeJS.Platform = process.platform
): boolean => {
  const sep = platform === 'win32' ? path.win32.sep : path.sep;
  const root = skillsRoot.endsWith(sep) ? skillsRoot : skillsRoot + sep;
  return platform === 'win32'
    ? resolved.toLowerCase().startsWith(root.toLowerCase())
    : resolved.startsWith(root);
};

export const linkTargetFor = (
  repoRoot: string,
  targetPath: string,
  name: string,
  platform: NodeJS.Platform = process.platform
): string => {
  const sourceAbs = path.join(repoRoot, SOURCE_PATH, name);
  if (platform === 'win32') {
    return sourceAbs;
  }
  return path.relative(path.dirname(targetPath), sourceAbs);
};

export const createSkillLink = (repoRoot: string, targetPath: string, name: string): void => {
  const target = linkTargetFor(repoRoot, targetPath, name);
  try {
    fs.symlinkSync(target, targetPath, LINK_TYPE);
  } catch (err) {
    if (isWin && err instanceof Error && 'code' in err && err.code === 'EPERM') {
      throw new Error(
        'ai: cannot create skill link on Windows (permission denied). ' +
          'Enable Developer Mode (Settings → System → For developers) or run the shell as Administrator.',
        { cause: err }
      );
    }
    throw err;
  }
};

// ── Logger ─────────────────────────────────────────────────────────────────────

export type LogAction = 'linked' | 'relinked' | 'forced' | 'pruned' | 'ok';
export type LogWarnKind = 'foreign-link' | 'real';
export type LogStatus = 'linked' | 'missing' | 'conflict' | 'stale';

export type Logger = {
  add: (targetRel: string, name: string, action: LogAction) => void;
  warn: (targetRel: string, name: string, kind: LogWarnKind) => void;
  section: (targetRel: string) => void;
  statusEntry: (status: LogStatus, name: string, detail?: string) => void;
  statusEmpty: () => void;
  blank: () => void;
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
    section: (targetRel) => {
      lines.push(`\n${targetRel}/`);
    },
    statusEntry: (status, name, detail) => {
      const suffix = detail !== undefined ? `  [${detail}]` : '';
      lines.push(`  ${status.padEnd(8)} ${name}${suffix}`);
    },
    statusEmpty: () => {
      lines.push('  (no source skills and no stale links)');
    },
    blank: () => {
      lines.push('');
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

/** True when any source skill is not linked in at least one target directory. */
export const hasMissingLinks = (repoRoot: string): boolean => {
  const skills = listSourceSkills(repoRoot);
  if (skills.length === 0) return false;

  for (const targetRel of TARGET_PATHS) {
    const targetDir = path.join(repoRoot, targetRel);
    for (const name of skills) {
      const entry = classify(repoRoot, path.join(targetDir, name), name);
      if (entry.kind === 'absent') return true;
    }
  }

  return false;
};

export const SETUP_HINT_LINES = [
  '',
  '────────────────────────────────────────────────────────',
  '  AI tooling missing initialization: run  yarn ai:sync',
  '  Links repo skills (.ai/skills/) into .agents/, .claude/, .cursor/',
  '────────────────────────────────────────────────────────',
  '',
] as const;

// ── Ownership detection ────────────────────────────────────────────────────────

export type EntryKind =
  | { kind: 'absent' }
  | { kind: 'ours'; correct: boolean }
  | { kind: 'foreign-link' }
  | { kind: 'real' };

export const classify = (repoRoot: string, targetPath: string, name: string): EntryKind => {
  let lst: fs.Stats;
  try {
    lst = fs.lstatSync(targetPath);
  } catch {
    return { kind: 'absent' };
  }

  if (lst.isSymbolicLink() === false) return { kind: 'real' };

  const linkTargetRaw = fs.readlinkSync(targetPath);
  const resolved = path.resolve(path.dirname(targetPath), linkTargetRaw);

  const skillsRoot = path.join(repoRoot, SOURCE_PATH);
  if (isUnderSkillsRoot(resolved, skillsRoot) === false) return { kind: 'foreign-link' };

  const expected = path.resolve(path.join(repoRoot, SOURCE_PATH, name));
  return { kind: 'ours', correct: pathsEqual(resolved, expected) };
};

const removeSkillEntry = (targetPath: string): void => {
  const lst = fs.lstatSync(targetPath);
  if (lst.isSymbolicLink() === true) {
    fs.unlinkSync(targetPath);
    return;
  }
  fs.rmSync(targetPath, { recursive: true, force: true });
};

export type SyncOptions = {
  force?: boolean;
};

// ── sync ──────────────────────────────────────────────────────────────────────

export const sync = (repoRoot: string, log: Logger, options: SyncOptions = {}): number => {
  const skills = listSourceSkills(repoRoot);
  const force = options.force === true;
  let warnings = 0;

  for (const targetRel of TARGET_PATHS) {
    const targetDir = path.join(repoRoot, targetRel);
    fs.mkdirSync(targetDir, { recursive: true });

    for (const name of skills) {
      const p = path.join(targetDir, name);
      const k = classify(repoRoot, p, name);

      if (k.kind === 'absent') {
        createSkillLink(repoRoot, p, name);
        log.add(targetRel, name, 'linked');
      } else if (k.kind === 'ours' && k.correct === false) {
        fs.unlinkSync(p);
        createSkillLink(repoRoot, p, name);
        log.add(targetRel, name, 'relinked');
      } else if (k.kind === 'ours') {
        log.add(targetRel, name, 'ok');
      } else if (force === true) {
        removeSkillEntry(p);
        createSkillLink(repoRoot, p, name);
        log.add(targetRel, name, 'forced');
      } else {
        warnings += 1;
        log.warn(targetRel, name, k.kind as LogWarnKind);
      }
    }

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
    }
  }

  log.flush();
  return 0;
};

// ── status ────────────────────────────────────────────────────────────────────

type StatusEntry = {
  name: string;
  status: LogStatus;
  detail?: string;
};

export const status = (repoRoot: string, log: Logger): number => {
  const skills = listSourceSkills(repoRoot);

  for (const targetRel of TARGET_PATHS) {
    const targetDir = path.join(repoRoot, targetRel);
    log.section(targetRel);

    const entries: StatusEntry[] = [];

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
      log.statusEmpty();
    }
    for (const e of entries) {
      log.statusEntry(e.status, e.name, e.detail);
    }
  }

  log.blank();
  log.flush();
  return 0;
};
