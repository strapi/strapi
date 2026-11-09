import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { FileChange } from './types';

/** The only folders of a project the migration writes in */
const WRITABLE_ROOTS = ['src', 'config'];

/** Where a change goes: inside `src/` or `config/` of the project, or an error */
const resolveInside = (appDir: string, relative: string): string => {
  const normalized = path.posix.normalize(relative.split(path.sep).join('/'));
  const [root] = normalized.split('/');

  if (
    path.isAbsolute(relative) ||
    normalized.startsWith('../') ||
    normalized === '..' ||
    !WRITABLE_ROOTS.includes(root) ||
    normalized === root
  ) {
    throw new Error(`Refusing to write ${relative}: it is not inside src/ or config/.`);
  }

  return path.join(appDir, ...normalized.split('/'));
};

const exists = (file: string) =>
  fs.access(file).then(
    () => true,
    () => false
  );

interface Step {
  target: string;
  /** The new content's temporary file; `null` when the file is deleted */
  temporary: string | null;
  /** Where the file that was there waits until every rename has gone through */
  backup: string | null;
  renamedAway: boolean;
  renamedIn: boolean;
}

/**
 * Writes the changes to a project: all or nothing. Each new file is written to a temporary sibling
 * first; only then is each file swapped in (the old one set aside, the new one renamed over it). If
 * anything fails, the temporaries go and every file that was swapped is put back as it was.
 * A path outside `src/` and `config/` is refused before anything is written.
 */
export const writeProjectFiles = async (appDir: string, changes: FileChange[]): Promise<void> => {
  const suffix = randomBytes(6).toString('hex');
  const steps: Step[] = [];

  for (const change of changes) {
    const target = resolveInside(appDir, change.path);

    steps.push({
      target,
      temporary: change.after === null ? null : `${target}.end-users-new-${suffix}`,
      backup: null,
      renamedAway: false,
      renamedIn: false,
    });
  }

  const rollback = async () => {
    for (const step of [...steps].reverse()) {
      if (step.renamedIn) {
        await fs.rm(step.target, { force: true }).catch(() => undefined);
      }

      if (step.renamedAway && step.backup) {
        await fs.rename(step.backup, step.target).catch(() => undefined);
      }

      if (step.temporary) {
        await fs.rm(step.temporary, { force: true }).catch(() => undefined);
      }
    }
  };

  try {
    for (const [index, change] of changes.entries()) {
      const { temporary, target } = steps[index];

      if (temporary !== null && change.after !== null) {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(temporary, change.after);
      }
    }

    for (const step of steps) {
      if (await exists(step.target)) {
        step.backup = `${step.target}.end-users-old-${suffix}`;
        await fs.rename(step.target, step.backup);
        step.renamedAway = true;
      }

      if (step.temporary !== null) {
        await fs.rename(step.temporary, step.target);
        step.renamedIn = true;
      }
    }
  } catch (error) {
    await rollback();

    throw error;
  }

  for (const step of steps) {
    if (step.backup) {
      await fs.rm(step.backup, { force: true }).catch(() => undefined);
    }
  }
};
