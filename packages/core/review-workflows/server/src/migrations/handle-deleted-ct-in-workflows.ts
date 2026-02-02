import { difference, keys } from 'lodash/fp';
import { async } from '@strapi/utils';
import { WORKFLOW_MODEL_UID } from '../constants/workflows';
import { getWorkflowContentTypeFilter } from '../utils/review-workflows';

/**
 * Remove CT references from workflows if the CT is deleted
 */
async function migrateDeletedCTInWorkflows({ oldContentTypes, contentTypes }: any) {
  const deletedContentTypes = difference(keys(oldContentTypes), keys(contentTypes)) ?? [];

  if (deletedContentTypes.length) {
    await async.map(deletedContentTypes, async (deletedContentTypeUID: unknown) => {
      const workflow = await strapi.db.query(WORKFLOW_MODEL_UID).findOne({
        select: ['id', 'contentTypes'],
        where: {
          contentTypes: getWorkflowContentTypeFilter({ strapi }, deletedContentTypeUID),
        },
      });

      if (workflow) {
        await strapi.db.query(WORKFLOW_MODEL_UID).update({
          where: { id: workflow.id },
          data: {
            contentTypes: workflow.contentTypes.filter(
              (contentTypeUID: unknown) => contentTypeUID !== deletedContentTypeUID
            ),
          },
        });
      }
    });
  }
}

export default migrateDeletedCTInWorkflows;
