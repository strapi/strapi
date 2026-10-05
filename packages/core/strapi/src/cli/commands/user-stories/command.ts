import { createCommand } from 'commander';
import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import { action } from './action';

/**
 * `$ strapi user-stories:sync-e2e`
 *
 * Scaffold / reconcile Vitest e2e specs from the Gherkin acceptance criteria in
 * `docs/user-stories/`. Read-only by default (reports drift, non-zero exit); pass `--write` to
 * create missing specs and `--force` to regenerate ones that drifted.
 */
const command: StrapiCommand = () => {
  return createCommand('user-stories:sync-e2e')
    .description('Scaffold/reconcile Vitest e2e specs from docs/user-stories acceptance criteria')
    .option('-i, --input <dir>', 'Directory of user-story markdown files', 'docs/user-stories')
    .option('-w, --write', 'Write changes to disk (create missing specs)', false)
    .option(
      '-f, --force',
      'When writing, overwrite specs that have drifted (regenerates skeleton, dropping bodies)',
      false
    )
    .action(runAction('user-stories:sync-e2e', action));
};

export { command };
