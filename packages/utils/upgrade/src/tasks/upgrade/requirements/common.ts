import simpleGit from 'simple-git';

import { requirementFactory } from '../../../modules/requirement';

export const REQUIRE_GIT_CLEAN_REPOSITORY = requirementFactory(
  'REQUIRE_GIT_CLEAN_REPOSITORY',
  async (context) => {
    const git = simpleGit({ baseDir: context.project.cwd });

    const status = await git.status();

    if (!status.isClean()) {
      throw new Error(
        'Repository is not clean. Please commit or stash any changes before upgrading'
      );
    }
  }
);

export const REQUIRE_GIT_REPOSITORY = requirementFactory(
  'REQUIRE_GIT_REPOSITORY',
  async (context) => {
    const git = simpleGit({ baseDir: context.project.cwd });

    const isRepo = await git.checkIsRepo();

    if (!isRepo) {
      throw new Error('Not a git repository (or any of the parent directories)');
    }
  }
).addChild(REQUIRE_GIT_CLEAN_REPOSITORY.asOptional());

export const REQUIRE_GIT_INSTALLED = requirementFactory(
  'REQUIRE_GIT_INSTALLED',
  async (context) => {
    const git = simpleGit({ baseDir: context.project.cwd });

    try {
      await git.version();
    } catch {
      throw new Error('Git is not installed');
    }
  }
).addChild(REQUIRE_GIT_REPOSITORY.asOptional());

export const REQUIRE_GIT = requirementFactory('REQUIRE_GIT', null).addChild(
  REQUIRE_GIT_INSTALLED.asOptional()
);
