import { codemodRepositoryFactory } from '../../modules/codemod-repository';
import { projectFactory } from '../../modules/project';
import { findRangeFromTarget, resolvePath } from './utils';

import * as f from '../../modules/format';

import type { ListCodemodsOptions } from './types';

export const listCodemods = async (options: ListCodemodsOptions) => {
  const { logger, target } = options;

  const cwd = resolvePath(options.cwd);
  const project = projectFactory(cwd);
  const range = findRangeFromTarget(project, target);

  logger.debug(f.projectDetails(project));
  logger.debug(`Range: set to ${f.versionRange(range)}`);

  // Create a codemod repository targeting the default location of the codemods
  const repo = codemodRepositoryFactory();

  // Make sure all the codemods are loaded
  repo.refresh();

  // Find groups of codemods matching the given range
  const groups = repo.find({ range });

  // Flatten the groups into a simple codemod array
  const codemods = groups.flatMap((collection) => collection.codemods);

  // Debug
  logger.debug(`Found ${f.highlight(codemods.length)} codemods`);

  // Don't log an empty table
  if (codemods.length === 0) {
    logger.info(`Found no codemods matching ${f.versionRange(range)}`);
    return;
  }

  // Format the list to a pretty table
  const fCodemods = f.codemodList(codemods);

  logger.raw(fCodemods);
};
