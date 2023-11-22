import execa from 'execa';
import { resolve } from 'path';
import type { Logger } from '.';

type Params = {
  path: string;
  logger: Logger;
};

export const isCleanGitRepo = async ({ path, logger }: Params) => {
  try {
    // Check if the path is under version control
    await execa('git', ['-C', resolve(path), 'rev-parse']);
  } catch (error) {
    logger.warn('Unable to proceed with the upgrade:');
    logger.warn('  - The codebase is not under version control.');
    process.exit(1);
  }

  try {
    // Check if the git tree is clean
    const { stdout } = await execa('git', [
      `--git-dir=${path}/.git`,
      `--work-tree=${path}`,
      'status',
      '--porcelain',
    ]);
    if (stdout.length) {
      logger.warn('Unable to proceed with the upgrade:');
      logger.warn('  - The Git tree is not clean (uncommitted changes found).');
    }
  } catch (err: any) {
    logger.error(err.message);
    process.exit(1);
  }
};
