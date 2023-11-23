import assert from 'node:assert';
import { simpleGit } from 'simple-git';
import type { TaskOptions } from '../../types';

type Params = Pick<TaskOptions, 'confirm' | 'logger'> & {
  force: boolean;
  cwd: string;
};

export const isCleanGitRepo = async ({ cwd, logger, force, confirm }: Params) => {
  const git = simpleGit({ baseDir: cwd });
  const repoStatus = {
    isRepo: true,
    isClean: true,
    isGitInstalled: true,
  };

  try {
    // Check if Git is installed
    await git.version();
    // Check if the path is under version control
    repoStatus.isRepo = await git.checkIsRepo();

    // Check if the git tree is clean
    if (repoStatus.isRepo) {
      const status = await git.status();
      repoStatus.isClean = status.isClean();
    }
  } catch (err) {
    repoStatus.isGitInstalled = false;
  }

  // Ask the user if they want to continue with the process
  if (
    !force &&
    confirm &&
    (!repoStatus.isRepo || !repoStatus.isClean || !repoStatus.isGitInstalled)
  ) {
    logger.warn(`Unable to proceed with the upgrade:`);
    if (!repoStatus.isGitInstalled) {
      logger.warn('- Git is not installed.');
    }
    if (!repoStatus.isRepo) {
      logger.warn('- The codebase is not under version control.');
    }
    if (!repoStatus.isClean) {
      logger.warn('- The Git tree is not clean (uncommitted changes found).');
    }

    const shouldProceed = await confirm('Are you sure to proceed? [y/N]');
    assert(shouldProceed, 'Aborted');
  }
};
