import type { Core } from '@strapi/types';

import { getService } from './utils';
import migrateStageAttribute from './migrations/shorten-stage-attribute';
import migrateReviewWorkflowStagesColor from './migrations/set-stages-default-color';
import migrateReviewWorkflowStagesRoles from './migrations/set-stages-roles';
import migrateReviewWorkflowName from './migrations/set-workflow-default-name';
import migrateWorkflowsContentTypes from './migrations/multiple-workflows';
import migrateDeletedCTInWorkflows from './migrations/handle-deleted-ct-in-workflows';
import reviewWorkflowsMiddlewares from './middlewares/review-workflows';

export default async ({ strapi }: { strapi: Core.LoadedStrapi }) => {
  if (strapi.ee.features.isEnabled('review-workflows')) {
    strapi.hook('strapi::content-types.beforeSync').register(migrateStageAttribute);
    strapi
      .hook('strapi::content-types.afterSync')
      .register(migrateReviewWorkflowStagesColor)
      .register(migrateReviewWorkflowStagesRoles)
      .register(migrateReviewWorkflowName)
      .register(migrateWorkflowsContentTypes)
      .register(migrateDeletedCTInWorkflows);
    const reviewWorkflowService = getService('review-workflows');

    reviewWorkflowsMiddlewares.contentTypeMiddleware(strapi);
    await reviewWorkflowService.register(strapi.ee.features.get('review-workflows'));
  }
};
