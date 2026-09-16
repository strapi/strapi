import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { getScope } from '../scope/context';

/**
 * Two review-workflow operations rewrite every entry's stage for a content type
 * in one statement, and they do it with raw knex rather than through the query
 * builder — so the query scope, which narrows queries the builder makes, never
 * sees them.
 *
 * They run when a workflow's stages are reorganised or a content type is
 * removed from a workflow. Left alone, an administrator reorganising their own
 * space's workflow would move every other space's entries too.
 *
 * Rather than rewrite that SQL from here, the operations are refused from
 * inside a space: they are a project-wide change, so they are made from the
 * all-spaces view where their reach is what the caller expects. Everything else
 * about workflows — which ones a space has, which stage an entry is in, who it
 * is assigned to — stays per-space and is narrowed normally.
 */
export const registerReviewWorkflowIntegration = (strapi: Core.Strapi) => {
  const stages = strapi.plugin('review-workflows')?.service('stages') as
    | Record<string, (...args: unknown[]) => unknown>
    | undefined;

  if (!stages) {
    return;
  }

  for (const name of ['updateEntitiesStage', 'deleteAllEntitiesStage']) {
    const original = stages[name];

    if (typeof original !== 'function') {
      continue;
    }

    stages[name] = async (...args: unknown[]) => {
      const scope = getScope(strapi);

      if (scope.mode === 'space') {
        throw new errors.ForbiddenError(
          'Reorganising a workflow changes every space at once, so it has to be done from the all-spaces view.'
        );
      }

      return original.apply(stages, args);
    };
  }
};
