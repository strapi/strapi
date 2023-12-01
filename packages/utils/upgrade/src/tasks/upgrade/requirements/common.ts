import simpleGit from 'simple-git';

import { requirementFactory } from '../../../modules/requirement';

export const REQUIRE_GIT_CLEAN_REPOSITORY = requirementFactory(
  'REQUIRE_GIT_CLEAN_REPOSITORY',
  '',
  async (context) => {
    const { project } = context;
    const git = simpleGit({ baseDir: project.cwd });

    const status = await git.status();
    const isClean = status.isClean();

    if (!isClean) {
      throw new Error('The repository is not clean');
    }
  }
);

export const REQUIRE_GIT_REPOSITORY = requirementFactory(
  'REQUIRE_GIT_REPOSITORY',
  '',
  async (context) => {
    const { project } = context;
    const git = simpleGit({ baseDir: project.cwd });
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error('This directory is not a Git repository');
    }
  }
).addChild(REQUIRE_GIT_CLEAN_REPOSITORY.optional());

export const REQUIRE_GIT_INSTALLED = requirementFactory(
  'REQUIRE_GIT_INSTALLED',
  '',
  async (context) => {
    const { project } = context;
    const git = simpleGit({ baseDir: project.cwd });
    try {
      // Check if Git is installed
      await git.version();
    } catch (err) {
      throw new Error('Git is not installed');
    }
  }
).addChild(REQUIRE_GIT_REPOSITORY.optional());

export const REQUIRE_GIT = requirementFactory('REQUIRE_MAYBE_GIT', '', null).addChild(
  REQUIRE_GIT_INSTALLED.optional()
);
