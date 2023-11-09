import { difference, keys } from 'lodash/fp';
import { mapAsync } from '@strapi/utils';
import { WORKFLOW_MODEL_UID } from '../constants/workflows';
import { getWorkflowContentTypeFilter } from '../utils/review-workflows';

/**
 * @param {Object} oldContentTypes
 * @param {Object} contentTypes
 * @return {Promise<void>}
 */
async function migrateDeletedCTInWorkflows({ oldContentTypes, contentTypes }: any) {
  const deletedContentTypes = difference(keys(oldContentTypes), keys(contentTypes)) ?? [];

  if (deletedContentTypes.length) {
    await mapAsync(deletedContentTypes, async (deletedContentTypeUID: unknown) => {
      const workflow = await strapi.query(WORKFLOW_MODEL_UID).findOne({
        select: ['id', 'contentTypes'],
        where: {
          contentTypes: getWorkflowContentTypeFilter({ strapi }, deletedContentTypeUID),
        },
      });

      if (workflow) {
        await strapi.query(WORKFLOW_MODEL_UID).update({
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
